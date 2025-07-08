import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import styles from "./GraphPage.module.css";
import { parseRDFData } from "../../services/rdfParser";
import type { RDFLink, RDFNode } from "../../shared/types/graphTypes";

// 1. Выносим "магические числа" и настройки в константы
const GRAPH_CONFIG = {
  width: 900,
  height: 600,
  nodeRadius: 40,
  colors: {
    link: "#666",
    node: "#1f77b4",
    text: "white",
  },
  margin: { top: 20, right: 120, bottom: 20, left: 120 },
};

// 2. Определяем типы для данных, которые пойдут в рендер
interface RenderNode extends d3.HierarchyPointNode<RDFNode> {}
interface RenderLink extends d3.HierarchyPointLink<RDFNode> {}

const GraphPage: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // 3. Добавляем состояния для загрузки и ошибок
  const [nodes, setNodes] = useState<RenderNode[]>([]);
  const [links, setLinks] = useState<RenderLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 4. Логику получения данных выносим в отдельную функцию
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = window.location.origin + '/example.ttl';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const rdfText = await response.text();
        const { nodes: flatNodes, links: flatLinks } = parseRDFData(rdfText, url);

        // --- Логика построения иерархии ---
        const idMap = new Map(flatNodes.map((n) => [n.id, n]));
        const childrenMap = new Map<string, RDFNode[]>();
        flatLinks.forEach(({ source, target }) => {
          if (!childrenMap.has(source)) childrenMap.set(source, []);
          const targetNode = idMap.get(target);
          if (targetNode) childrenMap.get(source)!.push(targetNode);
        });

        const rootNode = flatNodes.find((n) => !flatLinks.some((l) => l.target === n.id));
        if (!rootNode) throw new Error("Root node not found in the graph.");
        
        const root = d3.hierarchy<RDFNode>(rootNode, (d) => childrenMap.get(d.id));
        
        // --- Расчет макета дерева ---
        const treeLayout = d3.tree<RDFNode>().size([
            GRAPH_CONFIG.height - GRAPH_CONFIG.margin.top - GRAPH_CONFIG.margin.bottom,
            GRAPH_CONFIG.width - GRAPH_CONFIG.margin.left - GRAPH_CONFIG.margin.right,
        ]);
        
        const treeRoot = treeLayout(root);

        // 5. Сохраняем рассчитанные данные в состояние React
        setNodes(treeRoot.descendants());
        setLinks(treeRoot.links());
        
      } catch (err: any) {
        setError(err.message || "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // Пустой массив зависимостей, чтобы эффект выполнился один раз

  // 6. D3 используется только для генерации атрибутов, а не для создания элементов
  const linkPathGenerator = useMemo(() => 
    d3.linkHorizontal<RenderLink, RenderNode>()
      .x(d => d.y) // Оси намеренно поменяны местами для горизонтального дерева
      .y(d => d.x),
  []);

  // 7. Рендерим UI в зависимости от состояния
  if (isLoading) {
    return <div>Loading graph...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>Error: {error}</div>;
  }

  return (
    <div className={styles["graph-page"]}>
      {/* ... ваша шапка ... */}
      <div className={styles["graph-page__content"]}>
        {/* 8. Рендеринг SVG происходит декларативно через JSX */}
        <svg
          ref={svgRef}
          width={GRAPH_CONFIG.width}
          height={GRAPH_CONFIG.height}
          className={styles["graph-page__svg"]}
        >
          <g transform={`translate(${GRAPH_CONFIG.margin.left}, ${GRAPH_CONFIG.margin.top})`}>
            {/* Рендер связей */}
            {links.map((link, i) => (
              <path
                key={i}
                className={styles.link}
                d={linkPathGenerator(link)!}
                fill="none"
                stroke={GRAPH_CONFIG.colors.link}
              />
            ))}
            {/* Рендер узлов */}
            {nodes.map((node, i) => (
              <g key={i} className={styles.node} transform={`translate(${node.y}, ${node.x})`}>
                <circle r={GRAPH_CONFIG.nodeRadius} fill={GRAPH_CONFIG.colors.node} />
                <text dy="0.31em" textAnchor="middle" fill={GRAPH_CONFIG.colors.text} fontSize="10">
                  {node.data.label}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
};

export default GraphPage;