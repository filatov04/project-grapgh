import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import styles from "./GraphPage.module.css";
import { parseRDFData} from "../../services/rdfParser";
import type { RDFNode } from "../../shared/types/graphTypes";

const GraphPage: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;

    const fetchAndRender = async () => {
      const url = window.location.origin + '/example.ttl';
      try {
        // insert
        const response = await fetch(url);
        const rdfText = await response.text();

        const { nodes, links } = parseRDFData(rdfText, url);
        const idMap = new Map(nodes.map((n) => [n.id, n] as [string, RDFNode]));
        const childrenMap = new Map<string, RDFNode[]>();
        
        links.forEach(({ source, target }) => {
          if (!childrenMap.has(source)) {
            childrenMap.set(source, []);
          }
          const targetNode = idMap.get(target);
          if (targetNode) {
            childrenMap.get(source)!.push(targetNode);
          }
        });
        
        const rootNode = nodes.find((n) => !links.some((l) => l.target === n.id));
        if (!rootNode) {
            throw new Error("Root node not found in the graph.");
        }
        
        const root = d3.hierarchy<RDFNode>(
          rootNode,
          (d) => childrenMap.get(d.id) || []
        );

        const tree = d3.tree<RDFNode>().size([height - 40, width - 40]);
        tree(root);
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

      } catch (error) {
        console.error("Error fetching or parsing RDF data:", error);
      }
    }
    // Собираем иерархию
    

    fetchAndRender();

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