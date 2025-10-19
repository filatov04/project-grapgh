from typing import List
from fastapi import APIRouter, HTTPException, Query, Body, Request, Path
import logging

from models.graph import GraphResponse, RDFNode, OntologyNode
from dao.competency_dao import CompetencyDAO
from dao.version_dao import VersionDAO
from dependencies.auth import get_current_user_email

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/competencies/graph", response_model=GraphResponse)
async def get_graph() -> dict:
    """Получить весь граф компетенций из GraphDB"""
    try:
        logger.info("Fetching full competency graph")
        return await CompetencyDAO.get_graph_from_db()
    except Exception as e:
        logger.error(f"Error fetching graph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/competencies/graph")
async def save_graph(graph_data: dict = Body(...)) -> dict:
    """Сохранить граф компетенций в GraphDB"""
    try:
        # Валидация данных перед сохранением
        nodes = graph_data.get("nodes", [])
        links = graph_data.get("links", [])

        # Проверяем узлы
        valid_nodes = []
        for node in nodes:
            if node.get("id", "").startswith(("http://", "https://")):
                valid_nodes.append(node)
            else:
                logger.warning(f"Skipping invalid node URI: {node.get('id', '')}")

        # Проверяем связи
        valid_links = []
        for link in links:
            source = link.get("source", "")
            predicate = link.get("predicate", "")
            target = link.get("target", "")

            if (source.startswith(("http://", "https://")) and
                predicate.startswith(("http://", "https://")) and
                target.startswith(("http://", "https://"))):
                valid_links.append(link)
            else:
                logger.warning(f"Skipping invalid link: {source} -> {target} (predicate: {predicate})")

        # Обновляем данные с валидными элементами
        validated_data = {
            "nodes": valid_nodes,
            "links": valid_links
        }

        nodes_count = len(valid_nodes)
        links_count = len(valid_links)
        logger.info(f"Saving graph: {nodes_count} nodes, {links_count} links")
        await CompetencyDAO.save_graph_to_db(validated_data)
        return {"status": "success", "nodes": nodes_count, "links": links_count}
    except Exception as e:
        logger.error(f"Error saving graph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/competencies/graph/part", response_model=GraphResponse)
async def get_graph_part(
    node_id: str = Query(..., description="URI узла"),
    depth: int = Query(2, ge=1, le=5),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> dict:
    """
    Получает часть графа от указанного узла с заданной глубиной.
    """
    try:
        logger.info(f"Fetching graph part: node={node_id}, depth={depth}, limit={limit}")
        return await CompetencyDAO.get_graph_part(
            start_from=node_id,
            depth=depth,
            limit=limit,
            offset=offset
        )
    except Exception as e:
        logger.error(f"Error fetching graph part: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/competencies/graph/from_json")
async def get_graph_from_json(
    graph_data: dict = Body(...),
    start_from: str = Query(...),
    depth: int = Query(2)
):
    return await CompetencyDAO.get_graph_part_from_json(
        graph_data=graph_data,
        start_from=start_from,
        depth=depth
    )


@router.get("/competencies/node/ancestors", response_model=List[OntologyNode])
async def get_ancestors(
    node_id: str = Query(..., description="URI узла"),
    limit: int = Query(50, ge=1, le=100, description="Количество узлов на странице"),
    offset: int = Query(0, ge=0, description="Смещение для пагинации"),
) -> List[OntologyNode]:
    """Получить всех предков компетенции"""
    try:
        logger.info(f"Fetching ancestors for node: {node_id}")
        return await CompetencyDAO.get_ancestors(
            competency_id=node_id,
            limit=limit,
            offset=offset
        )
    except Exception as e:
        logger.error(f"Error fetching ancestors: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/competencies/node/descendants", response_model=List[OntologyNode])
async def get_descendants(
    node_id: str = Query(..., description="URI узла"),
    limit: int = Query(50, ge=1, le=100, description="Количество узлов на странице"),
    offset: int = Query(0, ge=0, description="Смещение для пагинации"),
) -> List[OntologyNode]:
    """Получить всех потомков компетенции"""
    try:
        logger.info(f"Fetching descendants for node: {node_id}")
        return await CompetencyDAO.get_descendants(
            competency_id=node_id,
            limit=limit,
            offset=offset
        )
    except Exception as e:
        logger.error(f"Error fetching descendants: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/competencies/node/version")
async def get_node_version(
    node_id: str = Query(..., description="URI узла"),
) -> dict:
    """
    Получить текущую версию узла.
    Возвращает версию и время последнего изменения.
    """
    try:
        logger.info(f"Getting version for node: {node_id}")
        version_info = await VersionDAO.get_node_version(node_id)

        if version_info is None:
            # Узел ещё не версионирован
            return {
                "node_uri": node_id,
                "version": 0,
                "last_modified": None
            }

        return version_info
    except Exception as e:
        logger.error(f"Error getting node version: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/competencies/node/history")
async def get_node_history(
    node_id: str = Query(..., description="URI узла"),
    limit: int = Query(10, ge=1, le=100, description="Количество записей истории"),
) -> list[dict]:
    """
    Получить историю изменений узла.
    """
    try:
        logger.info(f"Getting history for node: {node_id}")
        history = await VersionDAO.get_node_history(node_id, limit)
        return history
    except Exception as e:
        logger.error(f"Error getting node history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/competencies/node/update")
async def update_node_with_version(
    node_id: str = Query(..., description="URI узла"),
    request: Request = None,
    data: dict = Body(...),
) -> dict:
    """
    Обновить узел с проверкой версии.
    Body должен содержать: version, old_value, new_value
    """
    try:
        # Получаем user_id из токена
        user_email = get_current_user_email(request)
        user_id = request.state.user_id

        expected_version = data.get("version", 0)
        old_value = data.get("old_value")
        new_value = data.get("new_value")

        # Проверяем конфликт версий
        if expected_version > 0:
            no_conflict = await VersionDAO.check_version_conflict(node_id, expected_version)
            if not no_conflict:
                current = await VersionDAO.get_node_version(node_id)
                raise HTTPException(
                    status_code=409,
                    detail=f"Version conflict: expected {expected_version}, current {current['version']}"
                )

        # Обновляем версию
        new_version = await VersionDAO.create_or_update_version(
            node_uri=node_id,
            user_id=user_id,
            change_type="UPDATE",
            old_value=old_value,
            new_value=new_value
        )

        logger.info(f"Updated node {node_id} to version {new_version} by user {user_email}")

        return {
            "status": "success",
            "node_uri": node_id,
            "version": new_version
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating node with version: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/competencies/path", response_model=List[OntologyNode])
async def find_path(
    start_id: str = Query(..., description="ID начальной компетенции"),
    end_id: str = Query(..., description="ID конечной компетенции"),
) -> List[OntologyNode]:
    """Найти путь между двумя компетенциями в графе"""
    try:
        logger.info(f"Finding path from {start_id} to {end_id}")
        return await CompetencyDAO.find_path(
            start_id=start_id,
            end_id=end_id
        )
    except Exception as e:
        logger.error(f"Error finding path: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
