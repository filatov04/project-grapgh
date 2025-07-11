import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import styles from "./GraphPage.module.css";

interface RDFNode {
  id: string;
  label: string;
}
interface RDFLink {
  source: string;
  target: string;
  predicate: string;
}

const GraphPage: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const nodes: RDFNode[] = [
    { id: "S", label: "S" },
    { id: "S1", label: "S1" },
    { id: "O", label: "O" },
  ];
  const links: RDFLink[] = [
    { source: "S", target: "S1", predicate: "p name" },
    { source: "S1", target: "O", predicate: "R" },
  ];

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;

    // Собираем иерархию
    const idMap = new Map(nodes.map((n) => [n.id, n] as [string, RDFNode]));
    const childrenMap = new Map<string, RDFNode[]>();
    links.forEach(({ source, target }) => {
      if (!childrenMap.has(source)) childrenMap.set(source, []);
      childrenMap.get(source)!.push(idMap.get(target)!);
    });
    const rootId = nodes.find((n) => !links.some((l) => l.target === n.id))!.id;
    const root = d3.hierarchy<RDFNode>(
      idMap.get(rootId)!,
      (d) => childrenMap.get(d.id) || []
    );
    const tree = d3.tree<RDFNode>().size([height - 40, width - 40]);
    tree(root);

    // Центрируем граф
    const xs = root.descendants().map((d) => d.x!);
    const ys = root.descendants().map((d) => d.y!);
    const xMin = d3.min(xs)!,
      xMax = d3.max(xs)!;
    const yMin = d3.min(ys)!,
      yMax = d3.max(ys)!;
    const xOffset = (height - (xMax - xMin)) / 2 - xMin;
    const yOffset = (width - (yMax - yMin)) / 2 - yMin;

    const g = svg
      .append("g")
      .attr("transform", `translate(${yOffset},${xOffset})`);

    // Генератор путей для связей с корректной типизацией
    const linkGenerator = d3
      .linkHorizontal<
        d3.HierarchyPointLink<RDFNode>,
        d3.HierarchyPointNode<RDFNode>
      >()
      .x((d) => d.y!)
      .y((d) => d.x!);

    // Рендер связей
    g.selectAll("path.link")
      .data(root.links())
      .enter()
      .append("path")
      .classed("link", true)
      .attr("d", linkGenerator)
      .attr("stroke", "#666")
      .attr("fill", "none");

    // Рендер узлов
    const nodeG = g
      .selectAll("g.node")
      .data(root.descendants())
      .enter()
      .append("g")
      .classed("node", true)
      .attr("transform", (d) => `translate(${d.y!},${d.x!})`);

    nodeG.append("circle").attr("r", 20).attr("fill", "#1f77b4");
    nodeG
      .append("text")
      .attr("dy", 4)
      .attr("text-anchor", "middle")
      .text((d) => d.data.label);

    // Cleanup
    return () => {
      svg.selectAll("*").remove();
    };
  }, []);

  return (
    <div className={styles["graph-page"]}>
      <header className={styles["graph-page__header"]}>
        <nav className={styles["graph-page__tabs"]}>
          <button className={styles["graph-page__tab"]} aria-selected="true">
            Граф
          </button>
          <button className={styles["graph-page__tab"]}>Разметка</button>
        </nav>
        <button className={styles["graph-page__login"]}>
          Регистрация / Логин
        </button>
      </header>
      <div className={styles["graph-page__content"]}>
        <svg
          ref={svgRef}
          className={styles["graph-page__svg"]}
          width="100%"
          height="600px"
        />
      </div>
    </div>
  );
};

export default GraphPage;
