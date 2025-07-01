import { useEffect, useRef } from "react";
import * as d3 from "d3";

type NodeData = {
  id: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

type LinkData = {
  source: string | NodeData;
  target: string | NodeData;
};

const Graph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const nodes: NodeData[] = [
      { id: "Программирование" },
      { id: "JavaScript" },
      { id: "Python" },
      { id: "D3.js" },
      { id: "Анализ данных" },
      { id: "SQL" },
    ];
    const links: LinkData[] = [
      { source: "Программирование", target: "JavaScript" },
      { source: "Программирование", target: "Python" },
      { source: "JavaScript", target: "D3.js" },
      { source: "Python", target: "Анализ данных" },
      { source: "Анализ данных", target: "SQL" },
    ];
    const width = window.innerWidth;
    const height = window.innerHeight;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const simulation = d3.forceSimulation<NodeData, LinkData>(nodes).force(
      "link",
      d3
        .forceLink<NodeData, LinkData>(links)
        .id((d: NodeData) => d.id)
        .distance(100)
    );

    const link = svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.5);

    const node = svg
      .append("g")
      .selectAll<SVGCircleElement, NodeData>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 20)
      .attr("fill", "#69b3a2")
      .call(
        d3
          .drag<SVGCircleElement, NodeData, NodeData>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any
      );

    const label = svg
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d) => d.id)
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("font-size", 12);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as NodeData).x!)
        .attr("y1", (d) => (d.source as NodeData).y!)
        .attr("x2", (d) => (d.target as NodeData).x!)
        .attr("y2", (d) => (d.target as NodeData).y!);
      node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
      label.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
    });
  }, []);

  return <svg ref={svgRef} width="100%" height="100%" />;
};

export default Graph;
