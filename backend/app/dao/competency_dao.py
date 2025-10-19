from typing import List
import re
import logging
from fastapi import Depends
from dependency_injector import wiring
from SPARQLWrapper import SPARQLWrapper, SPARQLExceptions

import requests

from models.graph import OntologyNode, NodeType
from dependencies.config import Config

logger = logging.getLogger(__name__)


class CompetencyDAO:
    @classmethod
    def _get_prefixes(cls, config: Config) -> dict[str, str]:
        return {
            "": f"<{config.graphdb.url}/repositories/{config.graphdb.repository}#>",
            "rdf": "<http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
            "rdfs": "<http://www.w3.org/2000/01/rdf-schema#>",
            "owl": "<http://www.w3.org/2002/07/owl#>",
        }

    @classmethod
    def _prefix_str(cls, config: Config) -> str:
        prefixes = cls._get_prefixes(config)
        return "\n".join(f"PREFIX {k}: {v}" for k, v in prefixes.items())

    @classmethod
    async def _execute_stmt(cls, client: SPARQLWrapper, stmt: str) -> dict:

        client.setQuery(stmt)
        try:
            result = client.query().convert()
            return result
        except SPARQLExceptions.EndPointInternalError as e:
            raise RuntimeError(f"Ошибка GraphDB: {e}")
        except Exception as e:
            raise RuntimeError(f"Ошибка выполнения SPARQL-запроса: {e}")

    @classmethod
    def _extract_local_name(cls, uri: str) -> str:
        """
        Вытаскивает локальное имя из URI: http://example.org/university#compML → compML
        """
        match = re.search(r'#(.+)$', uri)
        return match.group(1) if match else uri


        #11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111



    @classmethod
    async def get_graph_from_db(
        cls,
        client: SPARQLWrapper = Depends(wiring.Provide["graphdb_client"]),
        config: Config = Depends(wiring.Provide["config"])
    ) -> dict:
        """
        Получает весь граф из GraphDB
        """
        prefixes = cls._prefix_str(config)

        # Используем SELECT вместо CONSTRUCT для получения данных в JSON
        query = f"""
        {prefixes}
        SELECT ?s ?p ?o
        WHERE {{
            ?s ?p ?o .
        }}
        """

        try:
            data = await cls._execute_stmt(client, query)
        except Exception as e:
            raise RuntimeError(f"Ошибка при получении графа: {str(e)}")

        # Преобразование в нужный формат
        nodes_dict = {}
        links = []

        for binding in data["results"]["bindings"]:
            s = binding["s"]["value"]
            p = binding["p"]["value"]
            o = binding["o"]["value"]

            # Добавляем субъект как узел
            if s not in nodes_dict:
                nodes_dict[s] = {
                    "id": s,
                    "label": s.split("#")[-1].split("/")[-1],
                    "type": "class"
                }

            # Если объект - URI, добавляем как узел
            if binding["o"]["type"] == "uri" and o not in nodes_dict:
                nodes_dict[o] = {
                    "id": o,
                    "label": o.split("#")[-1].split("/")[-1],
                    "type": "class"
                }

            # Добавляем связь (только если объект - URI)
            if binding["o"]["type"] == "uri":
                links.append({
                    "source": s,
                    "target": o,
                    "predicate": p
                })

        return {
            "nodes": list(nodes_dict.values()),
            "links": links
        }

    @classmethod
    async def save_graph_to_db(
        cls,
        graph_data: dict,
        config: Config = Depends(wiring.Provide["config"])
    ) -> bool:
        """
        Сохраняет граф в GraphDB через прямой HTTP запрос
        """
        type_map = {
            "class": "http://www.w3.org/2000/01/rdf-schema#Class",
            "property": "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"
        }

        # URL для GraphDB updates
        graphdb_url = f"{config.graphdb.url}/repositories/{config.graphdb.repository}/statements"
        auth = ("admin", "root")  # стандартные учетные данные GraphDB

        successful = 0
        total = 0

        # Обрабатываем узлы
        for node in graph_data.get("nodes", []):
            node_uri = node["id"]
            # Проверяем, что URI валидный (начинается с http:// или https://)
            if not node_uri.startswith(("http://", "https://")):
                logger.warning(f"Skipping invalid URI: {node_uri} (must start with http:// or https://)")
                total += 1
                continue

            node_type = type_map.get(node["type"], node["type"])
            label = node["label"].replace('"', '\\"')

            query = f"""
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            INSERT DATA {{ <{node_uri}> a <{node_type}>; rdfs:label "{label}". }}
            """

            try:
                response = requests.post(
                    graphdb_url,
                    data={"update": query},
                    auth=auth,
                    headers={"Accept": "application/json"}
                )
                response.raise_for_status()
                successful += 1
            except Exception as e:
                logger.warning(f"Failed to save node {node_uri}: {e}")

            total += 1

        # Обрабатываем связи
        for link in graph_data.get("links", []):
            source = link['source']
            predicate = link['predicate']
            target = link['target']

            # Проверяем, что все URI валидные (начинаются с http:// или https://)
            if not source.startswith(("http://", "https://")):
                logger.warning(f"Skipping invalid source URI: {source} (must start with http:// or https://)")
                total += 1
                continue

            if not predicate.startswith(("http://", "https://")):
                logger.warning(f"Skipping invalid predicate URI: {predicate} (must start with http:// or https://)")
                total += 1
                continue

            if not target.startswith(("http://", "https://")):
                logger.warning(f"Skipping invalid target URI: {target} (must start with http:// or https://)")
                total += 1
                continue

            query = f"""
            INSERT DATA {{ <{source}> <{predicate}> <{target}>. }}
            """

            try:
                response = requests.post(
                    graphdb_url,
                    data={"update": query},
                    auth=auth,
                    headers={"Accept": "application/json"}
                )
                response.raise_for_status()
                successful += 1
            except Exception as e:
                logger.warning(f"Failed to save link {source} -> {target}: {e}")

            total += 1

        logger.info(f"Saved graph to GraphDB: {successful}/{total} successful")
        return successful > 0

    @classmethod
    async def add_triple(
        cls,
        subject: str,
        predicate: str,
        object_value: str,
        config: Config = Depends(wiring.Provide["config"])
    ) -> bool:
        """
        Добавить один триплет в GraphDB
        """
        graphdb_url = f"{config.graphdb.url}/repositories/{config.graphdb.repository}/statements"
        auth = ("admin", "root")

        query = f"""
        INSERT DATA {{ <{subject}> <{predicate}> <{object_value}>. }}
        """

        try:
            response = requests.post(
                graphdb_url,
                data={"update": query},
                auth=auth,
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()
            logger.info(f"Added triple: <{subject}> <{predicate}> <{object_value}>")
            return True
        except Exception as e:
            logger.error(f"Failed to add triple: {e}")
            raise RuntimeError(f"Failed to add triple: {e}")

    @classmethod
    async def delete_triple(
        cls,
        subject: str,
        predicate: str,
        object_value: str,
        config: Config = Depends(wiring.Provide["config"])
    ) -> bool:
        """
        Удалить один триплет из GraphDB
        """
        graphdb_url = f"{config.graphdb.url}/repositories/{config.graphdb.repository}/statements"
        auth = ("admin", "root")

        query = f"""
        DELETE DATA {{ <{subject}> <{predicate}> <{object_value}>. }}
        """

        try:
            response = requests.post(
                graphdb_url,
                data={"update": query},
                auth=auth,
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()
            logger.info(f"Deleted triple: <{subject}> <{predicate}> <{object_value}>")
            return True
        except Exception as e:
            logger.error(f"Failed to delete triple: {e}")
            raise RuntimeError(f"Failed to delete triple: {e}")

    @classmethod
    async def delete_node(
        cls,
        node_uri: str,
        config: Config = Depends(wiring.Provide["config"])
    ) -> bool:
        """
        Удалить узел и все связанные с ним триплеты из GraphDB
        Удаляет все триплеты, где узел является субъектом или объектом
        """
        graphdb_url = f"{config.graphdb.url}/repositories/{config.graphdb.repository}/statements"
        auth = ("admin", "root")

        # Удаляем все триплеты, где узел является субъектом
        query1 = f"""
        DELETE WHERE {{ <{node_uri}> ?p ?o . }}
        """

        # Удаляем все триплеты, где узел является объектом
        query2 = f"""
        DELETE WHERE {{ ?s ?p <{node_uri}> . }}
        """

        try:
            # Выполняем первый запрос
            response = requests.post(
                graphdb_url,
                data={"update": query1},
                auth=auth,
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()

            # Выполняем второй запрос
            response = requests.post(
                graphdb_url,
                data={"update": query2},
                auth=auth,
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()

            logger.info(f"Deleted node: <{node_uri}> and all related triples")
            return True
        except Exception as e:
            logger.error(f"Failed to delete node: {e}")
            raise RuntimeError(f"Failed to delete node: {e}")

    @classmethod
    async def clear_repository(
        cls,
        config: Config = Depends(wiring.Provide["config"])
    ) -> bool:
        """
        Очистить весь репозиторий GraphDB
        ВНИМАНИЕ: Удаляет ВСЕ данные!
        """
        graphdb_url = f"{config.graphdb.url}/repositories/{config.graphdb.repository}/statements"
        auth = ("admin", "root")

        query = """
        DELETE WHERE { ?s ?p ?o . }
        """

        try:
            response = requests.post(
                graphdb_url,
                data={"update": query},
                auth=auth,
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()
            logger.warning("Cleared entire repository!")
            return True
        except Exception as e:
            logger.error(f"Failed to clear repository: {e}")
            raise RuntimeError(f"Failed to clear repository: {e}")
    #11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111


    @classmethod
    @wiring.inject
    async def get_graph_part(
        cls,
        start_from: str,
        depth: int = 2,
        limit: int = 50,
        offset: int = 0,
        client: SPARQLWrapper = Depends(wiring.Provide["graphdb_client"]),
        config: Config = Depends(wiring.Provide["config"])
    ) -> dict:
        """
        Возвращает часть графа в формате:
        {
            "nodes": [
                {"id": "...", "label": "...", "type": "..."}
            ],
            "links": [
                {"source": "...", "target": "...", "predicate": "..."}
            ]
        }
        """
        prefixes = cls._prefix_str(config)
        repo = config.graphdb.repository

        # Обработка URI
        if start_from.startswith(("http://", "https://")):
            start_uri = f"<{start_from}>"
        else:
            start_uri = f"<http://example.org/{repo}#{start_from}>"

        # Упрощённый запрос для получения части графа
        query = f"""
        {prefixes}

        SELECT DISTINCT ?id ?label ?type
        WHERE {{
            {{
                # Получаем начальный узел
                BIND({start_uri} AS ?id)
                OPTIONAL {{ ?id rdfs:label ?label . }}
            }}
            UNION
            {{
                # Получаем узлы напрямую связанные (глубина 1)
                {start_uri} ?p1 ?id .
                OPTIONAL {{ ?id rdfs:label ?label . }}
            }}
            UNION
            {{
                # Получаем узлы на глубине 2
                {start_uri} ?p1 ?mid1 .
                ?mid1 ?p2 ?id .
                OPTIONAL {{ ?id rdfs:label ?label . }}
            }}

            # Определяем тип узла
            BIND(
                IF(EXISTS {{ ?id a rdfs:Class }}, "class",
                IF(EXISTS {{ ?id a rdf:Property }}, "property",
                "literal")) AS ?type)
        }}
        OFFSET {offset}
        LIMIT {limit}
        """

        data = await cls._execute_stmt(client, query)

        # Собираем результаты - только узлы
        nodes = []
        seen_nodes = set()

        for binding in data["results"]["bindings"]:
            # Обработка узлов
            if "id" in binding:
                node_id = binding["id"]["value"]
                if node_id not in seen_nodes:
                    seen_nodes.add(node_id)
                    nodes.append({
                        "id": node_id,
                        "label": binding.get("label", {}).get("value", node_id),
                        "type": binding.get("type", {}).get("value", "class")
                    })

        # Получаем связи между найденными узлами
        links = await cls._get_links_between_nodes(client, config, list(seen_nodes))

        return {
            "nodes": nodes,
            "links": links
        }

    @classmethod
    async def _get_links_between_nodes(
        cls,
        client: SPARQLWrapper,
        config: Config,
        node_uris: list[str]
    ) -> list[dict]:
        """Получить связи между указанными узлами"""
        if not node_uris:
            return []

        prefixes = cls._prefix_str(config)

        # Формируем VALUES для узлов
        values_clause = " ".join([f"<{uri}>" for uri in node_uris])

        query = f"""
        {prefixes}

        SELECT DISTINCT ?source ?target ?predicate
        WHERE {{
            VALUES ?source {{ {values_clause} }}
            VALUES ?target {{ {values_clause} }}
            ?source ?predicate ?target .
            FILTER(?source != ?target)
        }}
        """

        try:
            data = await cls._execute_stmt(client, query)
            links = []
            for binding in data["results"]["bindings"]:
                if "source" in binding and "target" in binding:
                    links.append({
                        "source": binding["source"]["value"],
                        "target": binding["target"]["value"],
                        "predicate": binding.get("predicate", {}).get("value",
                            "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
                    })
            return links
        except Exception as e:
            logger.warning(f"Error getting links between nodes: {e}")
            return []

    @classmethod
    async def get_graph_part_from_json(
        cls,
        graph_data: dict,  # Принимаем готовый JSON
        start_from: str,    # Опционально: начальный узел для фильтрации
        depth: int = 2
    ) -> dict:
        """
        Фильтрует готовый граф в JSON-формате.
        Пример graph_data:
        {
          "nodes": [...],
          "links": [...]
        }
        """
        # 1. Фильтрация узлов
        nodes = [
            node for node in graph_data["nodes"]
            if node["id"] == start_from  # Простая фильтрация (можно сложнее)
        ]

        # 2. Фильтрация связей
        links = [
            link for link in graph_data["links"]
            if link["source"] == start_from or link["target"] == start_from
        ]

        return {
            "nodes": nodes[:depth*10],  # Упрощённая "глубина"
            "links": links[:depth*10]
        }



    @classmethod
    @wiring.inject
    async def get_ancestors(
        cls,
        competency_id: str,
        limit: int = 50,
        offset: int = 0,
        client: SPARQLWrapper = Depends(wiring.Provide["graphdb_client"]),
        config: Config = Depends(wiring.Provide["config"])
    ) -> List[OntologyNode]:
        """
        Возвращает предков компетенции с идентификатором `competency_id`,
        с учетом лимита и смещения (offset).
        """
        prefixes = cls._prefix_str(config)

        if competency_id.startswith("http://") or competency_id.startswith("https://"):
            comp_uri = f"<{competency_id}>"
        else:
            comp_uri = f"<http://example.org/{config.graphdb.repository}#{competency_id}>"

        query = f"""
        {prefixes}

        SELECT DISTINCT ?ancestor ?label ?level
        WHERE {{
        ?ancestor (<http://example.org/hasSubCompetence>)+ {comp_uri} .
        OPTIONAL {{ ?ancestor rdfs:label ?label . }}
        OPTIONAL {{
            ?ancestor :hasLevel1 ?_ .
            BIND(1 AS ?level)
        }}
        OPTIONAL {{
            ?ancestor :hasLevel2 ?_ .
            BIND(2 AS ?level)
        }}
        OPTIONAL {{
            ?ancestor :hasLevel3 ?_ .
            BIND(3 AS ?level)
        }}
        OPTIONAL {{
            ?ancestor :hasLevel4 ?_ .
            BIND(4 AS ?level)
        }}
        OPTIONAL {{
            ?ancestor :hasLevel5 ?_ .
            BIND(5 AS ?level)
        }}
        }}
        OFFSET {offset}
        LIMIT {limit}
        """

        data = await cls._execute_stmt(client, query)

        ancestors = []
        for binding in data["results"]["bindings"]:
            ancestor_uri = binding["ancestor"]["value"]
            label = binding.get("label", {}).get("value", ancestor_uri)

            ancestors.append(
                OntologyNode(
                    id=ancestor_uri,
                    label=label,
                    type=NodeType.CLASS
                )
            )

        return ancestors

    @classmethod
    @wiring.inject
    async def get_descendants(
        cls,
        competency_id: str,
        limit: int = 50,
        offset: int = 0,
        client: SPARQLWrapper = Depends(wiring.Provide["graphdb_client"]),
        config: Config = Depends(wiring.Provide["config"])
    ) -> List[OntologyNode]:
        """
        Возвращает потомков компетенции с идентификатором `competency_id`,
        с учетом лимита и смещения (offset).
        """
        prefixes = cls._prefix_str(config)

        if competency_id.startswith("http://") or competency_id.startswith("https://"):
            comp_uri = f"<{competency_id}>"
        else:
            comp_uri = f"<http://example.org/{config.graphdb.repository}#{competency_id}>"

        query = f"""
        {prefixes}

        SELECT DISTINCT ?descendant ?label ?level
        WHERE {{
        {comp_uri} (<http://example.org/hasSubCompetence>)+ ?descendant .
        OPTIONAL {{ ?descendant rdfs:label ?label . }}
        OPTIONAL {{
            ?descendant :hasLevel1 ?_ .
            BIND(1 AS ?level)
        }}
        OPTIONAL {{
            ?descendant :hasLevel2 ?_ .
            BIND(2 AS ?level)
        }}
        OPTIONAL {{
            ?descendant :hasLevel3 ?_ .
            BIND(3 AS ?level)
        }}
        OPTIONAL {{
            ?descendant :hasLevel4 ?_ .
            BIND(4 AS ?level)
        }}
        OPTIONAL {{
            ?descendant :hasLevel5 ?_ .
            BIND(5 AS ?level)
        }}
        }}
        OFFSET {offset}
        LIMIT {limit}
        """

        data = await cls._execute_stmt(client, query)

        descendants = []
        for binding in data["results"]["bindings"]:
            descendant_uri = binding["descendant"]["value"]
            label = binding.get("label", {}).get("value", descendant_uri)

            descendants.append(
                OntologyNode(
                    id=descendant_uri,
                    label=label,
                    type=NodeType.CLASS
                )
            )

        return descendants

    @classmethod
    @wiring.inject
    async def find_path(
        cls,
        start_id: str,
        end_id: str,
        client: SPARQLWrapper = Depends(wiring.Provide["graphdb_client"]),
        config: Config = Depends(wiring.Provide["config"])
    ) -> List[OntologyNode]:
        """
        Находит путь от start_id до end_id по связям :hasSubCompetence.
        Возвращает список узлов на пути или пустой список, если путь не найден.
        """
        prefixes = cls._prefix_str(config)

        if start_id.startswith("http://") or start_id.startswith("https://"):
            start_uri = f"<{start_id}>"
        else:
            start_uri = f"<http://example.org/{config.graphdb.repository}#{start_id}>"

        if end_id.startswith("http://") or end_id.startswith("https://"):
            end_uri = f"<{end_id}>"
        else:
            end_uri = f"<http://example.org/{config.graphdb.repository}#{end_id}>"

        query = f"""
        {prefixes}

        SELECT ?node ?label
        WHERE {{
        VALUES (?start ?end) {{ ({start_uri} {end_uri}) }}

        ?start (<http://example.org/hasSubCompetence>)+ ?end .

        ?node ( ^<http://example.org/hasSubCompetence>* | <http://example.org/hasSubCompetence>* ) ?end .

        OPTIONAL {{ ?node rdfs:label ?label . }}
        }}
        """

        data = await cls._execute_stmt(client, query)

        nodes = []
        seen = set()

        for binding in data["results"]["bindings"]:
            node_uri = binding["node"]["value"]
            label = binding.get("label", {}).get("value", node_uri)

            if node_uri not in seen:
                seen.add(node_uri)
                nodes.append(
                    OntologyNode(
                        id=node_uri,
                        label=label,
                        type=NodeType.CLASS
                    )
                )

        return nodes
