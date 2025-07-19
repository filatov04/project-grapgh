import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import styles from "./GraphPage.module.css";
import { ControlMenu } from "./ControlMenu";
import type { RDFLink, RDFNode } from "../../shared/types/graphTypes";
import PredicateManager from "../../shared/types/PredicateManager"
import { AddNoteMenu } from "./AddNodeMenu";
import OntologyManager from "../../shared/types/NodeManager";

const GraphPage: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showPredicateMenu, setShowPredicateMenu] = useState(false);
  const [predicates, setPredicates] = useState<string[]>([]);
  const [showNodeMenu, setNodeShowMenu] = useState(false);

  const handleAddPredicate = (newPredicate: string) => {
    PredicateManager.registerPredicate(newPredicate);
    setPredicates([...predicates, newPredicate]);
  };



  useEffect(() => {
    const fetchAndRender = async () => {
      const nodes: RDFNode[] = [
        {
          id: "http://www.w3.org/2000/01/rdf-schema#Class",
          label: "Class",
          type: "class",
          children: [],
        },
        {
          id: "http://www.w3.org/2000/01/rdf-schema#Property",
          label: "Property",
          type: "class",
          children: [],
        },
        {
          id: "http://www.w3.org/2002/07/owl#Thing",
          label: "Thing",
          type: "class",
          children: [],
        },
        {
          id: "http://www.w3.org/2000/01/rdf#возраст",
          label: "возраст",
          type: "property",
          children: [],
        },

        {
          id: "http://www.w3.org/2000/01/rdf#пол",
          label: "пол",
          type: "property",
          children: [],
        },

        {
          id: "Витя_Иванов",
          label: "Витя Иванов",
          type: "class",
          children: [],
        }
      ];

      const links: RDFLink[] = [
        {
          source: "http://www.w3.org/2000/01/rdf-schema#Class",
          target: "http://www.w3.org/2000/01/rdf-schema#Property",
          predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        },
        {
          source: "http://www.w3.org/2000/01/rdf-schema#Property",
          target: "http://www.w3.org/2000/01/rdf#возраст",
          predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        },
              {
          source: "http://www.w3.org/2000/01/rdf-schema#Property",
          target: "http://www.w3.org/2000/01/rdf#пол",
          predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#subClassOf"
        },

        {
          source: "http://www.w3.org/2002/07/owl#Thing",
          target: "Витя_Иванов",
          predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        },
      ];

      renderTree(nodes, links);
    };

    function buildTree(nodes: RDFNode[], links: RDFLink[]): RDFNode | undefined {
      const nodeMap = new Map<string, RDFNode>();
      nodes.forEach(node => {
        nodeMap.set(node.id, {...node, children: [] });
      });

      links.forEach(link => {
        const parent = nodeMap.get(link.source);
        const child = nodeMap.get(link.target);
        if (parent && child) {
          parent.children!.push(child);
        }
      });

      const rootNodes = nodes.filter(node => !links.some(l => l.target === node.id));

      if (rootNodes.length > 1) {
        return {
          id: "virtual_root",
          label: "Root",
          type: "class",
          children: rootNodes.map(node => nodeMap.get(node.id)!)
        };
      }

      return nodeMap.get(rootNodes[0].id);
    };

    function findPredicates(links: RDFLink[]): string[] {
    const uniquePredicates = new Set<string>();
    
    links.forEach(link => {
      const parts = link.predicate.split(/[#\/]/);
      const id = parts[parts.length - 1];
      uniquePredicates.add(id || link.predicate);
    });

    return Array.from(uniquePredicates).sort();
}

    const renderTree = (nodes: RDFNode[], links: RDFLink[]) => {
      const svgEl = svgRef.current;
      if (!svgEl) return;

      const svg = d3.select(svgEl);
      svg.selectAll("*").remove();

      const width = svgEl.clientWidth;
      const height = svgEl.clientHeight;
      const g = svg.append('g');

      const hierarchyData = buildTree(nodes, links);
      if (!hierarchyData) throw new Error("No root node found");

      const root = d3.hierarchy(hierarchyData);

      const treeLayout = d3.tree<RDFNode>()
        .size([height*0.4, width*0.4])
        .separation((a, b) => 0.5);

      treeLayout(root);

      const predicates = findPredicates(links);
      setPredicates(predicates);

      const buttonStyle = {
        width: 160,
        height: 40, 
        rx: 8,
        ry: 8,
        fill: "#4CAF50",
        stroke: "#388E3C",
        strokeWidth: 1
      };

      const predicatesButton  = svg.append('g')
        .attr("transform", `translate(20,${height-130})`) 
        .style("cursor", "pointer")
        .on("click", () => setShowMenu(true))
        .on("mouseover", function() {
          d3.select(this).select("rect").attr("fill", "#3d8f40");
        })
        .on("mouseout", function() {
          d3.select(this).select("rect").attr("fill", "#4CAF50");
        });

        //кнопка список предикатов
    predicatesButton.append("rect")
        .attr("width", buttonStyle.width)
        .attr("height", buttonStyle.height)
        .attr("rx", buttonStyle.rx)
        .attr("ry", buttonStyle.ry)
        .attr("fill", buttonStyle.fill)
        .attr("stroke", buttonStyle.stroke)
        .attr("stroke-width", buttonStyle.strokeWidth)
        .attr("filter", "url(#button-shadow)");

      predicatesButton.append("text")
        .attr("x", buttonStyle.width/2)
        .attr("y", buttonStyle.height/2 + 5)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-size", "14px")
        .attr("font-weight", "500")
        .text("Список предикатов");

      
      const addNodeButton = svg.append('g')
        .attr("transform", `translate(20,${height-80})`) // Ниже первой кнопки
        .style("cursor", "pointer")
        .on("click", () => setNodeShowMenu(true))
        .on("mouseover", function() {
          d3.select(this).select("rect").attr("fill", "#3d8f40");
        })
        .on("mouseout", function() {
          d3.select(this).select("rect").attr("fill", "#4CAF50");
        });


        addNodeButton.append("rect")
        .attr("width", buttonStyle.width)
        .attr("height", buttonStyle.height)
        .attr("rx", buttonStyle.rx)
        .attr("ry", buttonStyle.ry)
        .attr("fill", buttonStyle.fill)
        .attr("stroke", buttonStyle.stroke)
        .attr("stroke-width", buttonStyle.strokeWidth)
        .attr("filter", "url(#button-shadow)");


         addNodeButton.append("text")
        .attr("x", buttonStyle.width/2)
        .attr("y", buttonStyle.height/2 + 5)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-size", "14px")
        .attr("font-weight", "500")
        .text("Добавить узел");

      // Фильтр для тени (общий для обеих кнопок)
      const defs = svg.append("defs");
      const filter = defs.append("filter")
        .attr("id", "button-shadow")
        .attr("height", "130%")
        .attr("width", "130%");
      
      filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 2)
        .attr("result", "blur");
      filter.append("feOffset")
        .attr("in", "blur")
        .attr("dx", 1)
        .attr("dy", 1)
        .attr("result", "offsetBlur");
      
      const feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "offsetBlur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");

      // Отрисовка графа
      const linkPaths = g.selectAll(".link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", styles.link)
        .attr("d", d3.linkVertical()
          .x(d => d.x!)
          .y(d => d.y!))
        .attr("stroke-width", 1.5);

      linkPaths.each(function(d) {
        const source = d.source;
        const target = d.target;
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        
        const linkData = links.find(l => 
          l.source === source.data.id && l.target === target.data.id
        );
        
        if (linkData) {
          const label = linkData.predicate.split(/[#\/]/).pop() || linkData.predicate;
          
          g.append("text")
            .attr("class", styles.linkLabel)
            .attr("x", midX)
            .attr("y", midY)
            .attr("text-anchor", "middle")
            .attr("dy", "-0.5em")
            .text(label);
        }
      });

      const nodeGroups = g.selectAll(".node")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("class", d => `${styles.node} ${styles[d.data.type]}`)
        .attr("transform", d => `translate(${d.x},${d.y})`);

      nodeGroups.append("circle")
        .attr("r", 20)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

      nodeGroups.append("text")
        .attr("dy", ".31em")
        .attr("x", (d: any) => d.children ? -20 : 20)
        .style("text-anchor", d => d.children ? "end" : "start")
        .style("fill", "#333")
        .style("font-size", "14px")
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
        {showMenu && (
  <ControlMenu 
    onClose={() => setShowMenu(false)}
    predicates={predicates}
    onAddPredicate = {handleAddPredicate}
  />
)}


    </div>
  );
};

export default GraphPage;