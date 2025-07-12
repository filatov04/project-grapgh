import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import styles from "./GraphPage.module.css";
import { parseRDFData} from "../../services/rdfParser";
import type { RDFLink, RDFNode } from "../../shared/types/graphTypes";

const GraphPage: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);

useEffect(() => {
  const fetchAndRender = async () => {
    const url = window.location.origin + '/example.ttl';
    try {
      const response = await fetch(url);
      const rdfText = await response.text();
      const { nodes, links } = parseRDFData(rdfText, url);
      renderTree(nodes, links);
    } catch (error) {
      console.error("Error fetching or parsing RDF data:", error);
    }
  };

  const renderTree = (nodes: RDFNode[], links: RDFLink[]) => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const g = svg.append('g');
    gRef.current = g.node();

    const rootNodes = nodes.filter(node => node.depth === 0);
    const root = d3.hierarchy({
      id: "virtual_root",
      label: "Root",
      type: "class",
      children: rootNodes,
      depth: -1
    } as RDFNode);

    const width = svgEl.clientWidth;

    const nodeSize = 120; 
    const treeLayout = d3.tree<RDFNode>()
      .nodeSize([nodeSize * 1.5, nodeSize]) 
      .separation((a, b) => {
        return a.parent === b.parent ? 1.5 : 1;
      });

    treeLayout(root);


    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", styles.link)
      .attr("d", d3.linkVertical()
        .x(d => d.x!)
        .y(d => d.y!))
      .attr("stroke-width", 1.5);

    const nodeGroups = g.selectAll(".node")
      .data(root.descendants().filter(d => d.data.id !== "virtual_root"))
      .enter()
      .append("g")
      .attr("class", `${styles.node} ${(d: any) => styles[d.data.type]}`)
      .attr("transform", (d: any) => `translate(${d.x},${d.y})`);

    nodeGroups.append("circle")
      .attr("r", 15) 
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    nodeGroups.append("text")
      .attr("dy", ".31em")
      .attr("x", (d: any) => d.children ? -20 : 20) 
      .style("text-anchor", (d: any) => d.children ? "end" : "start")
      .style("fill", "#333")
      .style("font-size", "14px") 
      .style("font-family", "sans-serif")
      .style("pointer-events", "none")
      .text((d: any) => {
        const maxLength = 20;
        return d.data.label.length > maxLength 
          ? d.data.label.substring(0, maxLength) + '...' 
          : d.data.label;
      });

    const zoom = d3.zoom()
      .scaleExtent([0.3, 3]) 
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any)
      .call(zoom.transform, d3.zoomIdentity.translate(width/2, 60).scale(0.8)); 

    const simulation = d3.forceSimulation(root.descendants() as any)
      .force("x", d3.forceX().x(d => (d as any).x).strength(0.5))
      .force("y", d3.forceY().y(d => (d as any).y).strength(0.5))
      .force("collide", d3.forceCollide().radius(30)) 
      .stop();

    for (let i = 0; i < 100; i++) simulation.tick();
  };

  fetchAndRender();
  
  return () => {
    if (svgRef.current) {
      d3.select(svgRef.current).selectAll("*").remove();
    }
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