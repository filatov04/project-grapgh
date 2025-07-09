import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import styles from "./GraphPage.module.css";
import { parseRDFData } from "../../services/rdfParser";
import type { RDFLink, RDFNode } from "../../shared/types/graphTypes";

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

interface RenderNode extends d3.HierarchyPointNode<RDFNode> {}
interface RenderLink extends d3.HierarchyPointLink<RDFNode> {}
interface SimulationNode extends RDFNode, d3.SimulationNodeDatum {}

const GraphPage: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [nodes, setNodes] = useState<RenderNode[]>([]);
  const [originalLinks, setOriginalLinks] = useState<RDFLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;
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
        const { nodes, links } = parseRDFData(rdfText, url);
        setOriginalLinks(links);

        const simulation = d3.forceSimulation(nodes as SimulationNode[])
          .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
          .force("charge", d3.forceManyBody().strength(-150))
          .force("center", d3.forceCenter(width / 2, height / 2));
        
        const link = svg.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
          .selectAll("line")
          .data(links)
          .join("line")
            .attr("stroke-width", 1.5);

        const linkText = svg.append("g")
            .selectAll("text")
            .data(links)
            .join("text")
            .attr("font-size", "10px")
            .attr("fill", "#555")
            .text(d => d.predicate);

        const node = svg.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
          .selectAll("g")
          .data(nodes)
          .join("g");

        node.append("circle")
            .attr("r", 20)
            .attr("fill", "#1f77b4");

        node.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.3em")
            .attr("fill", "white")
            .text(d => d.label);
            
        // Добавляем возможность перетаскивания узлов
        node.call(d3.drag<any, any>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

        simulation.on("tick", () => {
          link
              .attr("x1", d => (d.source as any).x)
              .attr("y1", d => (d.source as any).y)
              .attr("x2", d => (d.target as any).x)
              .attr("y2", d => (d.target as any).y);

          linkText
              .attr("x", d => ((d.source as any).x + (d.target as any).x) / 2)
              .attr("y", d => ((d.source as any).y + (d.target as any).y) / 2);

          node
              .attr("transform", d => `translate(${d.x}, ${d.y})`);
        });

        // Функции для перетаскивания
        function dragstarted(event: any, d: any) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        }
        function dragged(event: any, d: any) {
          d.fx = event.x;
          d.fy = event.y;
        }
        function dragended(event: any, d: any) {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }
        
      } catch (err: any) {
        setError(err.message || "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const nodeMap = useMemo(() => 
    new Map(nodes.map(node => [node.data.id, node])), 
    [nodes] 
  );

  const linkPathGenerator = useMemo(() => 
    d3.linkHorizontal<any, d3.HierarchyPointNode<RDFNode>>()
      .x(d => d.y)
      .y(d => d.x),
  []);

  if (isLoading) {
    return <div>Loading graph...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>Error: {error}</div>;
  }

  return (
    <div className={styles["graph-page"]}>
      <div className={styles["graph-page__content"]}>
        <svg
          ref={svgRef}
          width={GRAPH_CONFIG.width}
          height={GRAPH_CONFIG.height}
          className={styles["graph-page__svg"]}
        >
          <g transform={`translate(${GRAPH_CONFIG.margin.left}, ${GRAPH_CONFIG.margin.top})`}>
            
            {originalLinks.map((link, i) => {
              const sourceNode = nodeMap.get(link.source);
              const targetNode = nodeMap.get(link.target);
              if (!sourceNode || !targetNode) {
                return null;
              }
              
              const midX = (sourceNode.y + targetNode.y) / 2;
              const midY = (sourceNode.x + targetNode.x) / 2;

              return (
                <g key={i} className={styles.linkGroup}>
                  <path
                    className={styles.link}
                    d={linkPathGenerator({ source: sourceNode, target: targetNode })!}
                    fill="none"
                    stroke={GRAPH_CONFIG.colors.link}
                  />
                  <text
                    x={midX}
                    y={midY}
                    dy="-5px"
                    textAnchor="middle" 
                    fill="#555"
                    fontSize="12px"
                  >
                    {link.predicate}
                  </text>
                </g>
              );
            })}
            
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