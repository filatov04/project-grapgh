// import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
// import * as d3 from "d3";
// import styles from "./GraphPage.module.css";
// import { ControlMenu } from "./ControlMenu";
// import { AddNoteMenu } from "./AddNodeMenu";
// import PredicateManager from "../../shared/types/PredicateManager";
// import OntologyManager from "../../shared/types/NodeManager";
// import { NewTripleMenu } from "./NewTriplet";
// import graphData from '../../../public/input.json'
// import type { RDFLink } from "../../shared/types/graphTypes";


// type NodeType = 'instance' | 'class' | 'property';

// interface BaseNode {
//   id: string;
//   label: string;
//   type: NodeType;
//   children?: BaseNode[];
// }

// interface RDFNode extends BaseNode {
//   children: RDFNode[];
// }


// const GraphPage: React.FC = () => {
//   const svgRef = useRef<SVGSVGElement | null>(null);
//   const [showMenu, setShowMenu] = useState(false);
//   const [showNodeMenu, setNodeShowMenu] = useState(false);
//   const [predicates, setPredicates] = useState<string[]>([]);
//   const [objects, setObjects] = useState<string[]>([]);
//   const [nodes, setNodes] = useState<RDFNode[]>([]);
//   const [links, setLinks] = useState<RDFLink[]>([]);



//   const processGraphData = useCallback((data: {nodes: BaseNode[], links: RDFLink[] }) => {
//     const processedNodes: RDFNode[] = data.nodes.map(node => ({
//       ...node,
//       children: []
//     }));

//     const nodeMap = new Map<string, RDFNode>();
//     processedNodes.forEach(node => nodeMap.set(node.id, node));

//     data.links.forEach(link => {
//       const parent = nodeMap.get(link.source);
//       const child = nodeMap.get(link.target);

//       if (parent && child) { parent.children.push(child) };

//     })
//     return {
//       nodes: processedNodes,
//       links: data.links
//     }
//   }, [])

//   const initializeData = useCallback(() => {
//     try {
//       const processed = processGraphData(graphData);
//       setNodes(processed.nodes);
//       setLinks(processed.links);
//       setPredicates(findPredicates(processed.links));
//     } catch (error) {
//       console.log("Error loading grapg data: ",error);
//             const fallbackNodes: RDFNode[] = [
//         {
//           id: "http://www.w3.org/2000/01/rdf-schema#Class",
//           label: "Class",
//           type: "class",
//           children: [],
//         }
//       ];
//       const fallbackLinks: RDFLink[] = [];
//       setNodes(fallbackNodes);
//       setLinks(fallbackLinks);
//     }
//   }, [processGraphData]);

//   // Построение дерева
//   const buildTree = useCallback((nodes: RDFNode[], links: RDFLink[]): RDFNode | undefined => {
//     const nodeMap = new Map<string, RDFNode>();
//     nodes.forEach(node => nodeMap.set(node.id, {...node, children: [] }));

//     links.forEach(link => {
//       const parent = nodeMap.get(link.source);
//       const child = nodeMap.get(link.target);
//       if (parent && child) parent.children!.push(child);
//     });

//     const rootNodes = nodes.filter(node => !links.some(l => l.target === node.id));
//     if (rootNodes.length > 1) {
//       return {
//         id: "virtual_root",
//         label: "Root",
//         type: "class",
//         children: rootNodes.map(node => nodeMap.get(node.id)!)
//       };
//     }
//     return nodeMap.get(rootNodes[0].id);
//   }, []);

//   // Поиск предикатов
//   const findPredicates = useCallback((links: RDFLink[]): string[] => {
//     const uniquePredicates = new Set<string>();
//     links.forEach(link => {
//       const parts = link.predicate.split(/[#\/]/);
//       uniquePredicates.add(parts[parts.length - 1] || link.predicate);
//     });
//     return Array.from(uniquePredicates).sort();
//   }, []);


//   const findNodes = useCallback((nodes: RDFNode[]): string[] =>{
//     const uniqueNodes = new Set<string>();
//     nodes.forEach(node =>{
//       uniqueNodes.add(node.label);
//     });
//     return Array.from(uniqueNodes).sort()
//   }, []);

//   // Отрисовка графа
//   const renderTree = useCallback(() => {
//     if (!nodes.length || !links.length) return;

//     const svgEl = svgRef.current;
//     if (!svgEl) return;

//     const svg = d3.select(svgEl);
//     svg.selectAll("*").remove();

//     const width = svgEl.clientWidth;
//     const height = svgEl.clientHeight;
//     const g = svg.append('g');

//     const hierarchyData = buildTree(nodes, links);

//     if (!hierarchyData) return;

//     const root = d3.hierarchy(hierarchyData);
//     const treeLayout = d3.tree<RDFNode>()
//       .size([height * 0.4, width * 0.4])
//       .separation((a, b) => 0.5);

//     treeLayout(root);

//     // Стиль кнопок
//     const buttonStyle = {
//       width: 160,
//       height: 40, 
//       rx: 8,
//       ry: 8,
//       fill: "#ffffffff",
//       stroke: "#000000ff",
//       strokeWidth: 1
//     };

//     // Создание кнопок
//     const createButton = (yPos: number, text: string, onClick: () => void) => {
//       const button = svg.append('g')
//         .attr("transform", `translate(20,${yPos})`) 
//         .style("cursor", "pointer")
//         .on("click", onClick)
//         .on("mouseover", function() {
//           d3.select(this).select("rect").attr("fill", "#c08bdcff");
//         })
//         .on("mouseout", function() {
//           d3.select(this).select("rect").attr("fill", "#ffffffff");
//         });

//       button.append("rect")
//         .attr("width", buttonStyle.width)
//         .attr("height", buttonStyle.height)
//         .attr("rx", buttonStyle.rx)
//         .attr("ry", buttonStyle.ry)
//         .attr("fill", buttonStyle.fill)
//         .attr("stroke", buttonStyle.stroke)
//         .attr("stroke-width", buttonStyle.strokeWidth)
//         .attr("filter", "url(#button-shadow)");

//       button.append("text")
//         .attr("x", buttonStyle.width / 2)
//         .attr("y", buttonStyle.height / 2 + 5)
//         .attr("text-anchor", "middle")
//         .attr("fill", "black")
//         .attr("font-size", "14px")
//         .attr("font-weight", "500")
//         .text(text);
//     };

//     // Добавление кнопок
//     createButton(height - 80, "Создать новый", () => setShowMenu(true));


//     // Добавление тени для кнопок
//     const defs = svg.append("defs");
//     const filter = defs.append("filter")
//       .attr("id", "button-shadow")
//       .attr("height", "130%")
//       .attr("width", "130%");
    
//     filter.append("feGaussianBlur")
//       .attr("in", "SourceAlpha")
//       .attr("stdDeviation", 2)
//       .attr("result", "blur");
//     filter.append("feOffset")
//       .attr("in", "blur")
//       .attr("dx", 1)
//       .attr("dy", 1)
//       .attr("result", "offsetBlur");
    
//     const feMerge = filter.append("feMerge");
//     feMerge.append("feMergeNode").attr("in", "offsetBlur");
//     feMerge.append("feMergeNode").attr("in", "SourceGraphic");

//     // Отрисовка связей
//     g.selectAll(".link")
//       .data(root.links())
//       .enter()
//       .append("path")
//       .attr("class", styles.link)
//       .attr("d", d3.linkVertical()
//         .x(d => d.x!)
//         .y(d => d.y!))
//       .attr("stroke-width", 1.5)
//       .each(function(d) {
//         const midX = (d.source.x! + d.target.x!) / 2;
//         const midY = (d.source.y! + d.target.y!) / 2;
        
//         const linkData = links.find(l => 
//           l.source === d.source.data.id && l.target === d.target.data.id
//         );
        
//         if (linkData) {
//           const label = linkData.predicate.split(/[#\/]/).pop() || linkData.predicate;
          
//           g.append("text")
//             .attr("class", styles.linkLabel)
//             .attr("x", midX)
//             .attr("y", midY)
//             .attr("text-anchor", "middle")
//             .attr("dy", "-0.5em")
//             .text(label);
//         }
//       });

//     // Отрисовка узлов
//     const nodeGroups = g.selectAll(".node")
//       .data(root.descendants())
//       .enter()
//       .append("g")
//       .attr("class", d => `${styles.node} ${styles[d.data.type]}`)
//       .attr("transform", d => `translate(${d.x},${d.y})`);

//     nodeGroups.append("circle")
//       .attr("r", 20)
//       .attr("stroke", "#fff")
//       .attr("stroke-width", 2);

//     nodeGroups.append("text")
//       .attr("dy", ".31em")
//       .attr("x", d => d.children ? -20 : 20)
//       .style("text-anchor", d => d.children ? "end" : "start")
//       .style("fill", "#333")
//       .style("font-size", "14px")
//       .text(d => d.data.label.length > 20 
//         ? `${d.data.label.substring(0, 20)}...` 
//         : d.data.label
//       );

//     // Добавление масштабирования
//     const zoom = d3.zoom()
//       .scaleExtent([0.3, 3])
//       .on("zoom", (event) => {
//         g.attr("transform", event.transform);
//       });

//     svg.call(zoom as any)
//       .call(zoom.transform, d3.zoomIdentity.translate(width / 2, 60).scale(0.8));
//   }, [nodes, links, buildTree]);

//     // Добавление предиката
//   const handleAddPredicate = useCallback((newPredicate: string) => {
//     PredicateManager.registerPredicate(newPredicate);
//     setPredicates(prev => [...prev, newPredicate]);
//   }, []);

//     const handleAddObject = useCallback((newObject: string) => {
//       const newNode : RDFNode = {
//         id: newObject,
//         label: newObject,
//         type: 'instance',
//         children: []
//       }

//     nodes.push(newNode)
//     setObjects(obj => [...obj, newObject]);

  
//   }, []);

  
//   // Инициализация компонента
//   useEffect(() => {
//     initializeData();
//     return () => {
//       if (svgRef.current) {
//         d3.select(svgRef.current).selectAll("*").remove();
//       }
//     };
//   }, [initializeData]);

//   // Отрисовка при изменении данных
//   useEffect(() => {
//     renderTree();
//   }, [nodes, links, renderTree]);

//   return (
//     <div className={styles["graph-page"]}>
//       <header className={styles["graph-page__header"]}>
//         <nav className={styles["graph-page__tabs"]}>
//           <button className={styles["graph-page__tab"]} aria-selected="true">
//             Граф
//           </button>
//           <button className={styles["graph-page__tab"]}>Разметка</button>
//         </nav>
//         <button className={styles["graph-page__login"]}>
//           Регистрация / Логин
//         </button>
//       </header>
//       <div className={styles["graph-page__content"]}>
//         <svg
//           ref={svgRef}
//           className={styles["graph-page__svg"]}
//           width="100%"
//           height="600px"
//         />
//       </div>
//       {showMenu && (
//         <NewTripleMenu
//           onClose={() => setShowMenu(false)}
//           predicates={findPredicates(links)}
//           subjects={findNodes(nodes)}
//           objects={findNodes(nodes)}
//           onAddPredicate={handleAddPredicate} 
//           onAddObject = {handleAddObject}
//           onAddTriple={function (subject: string, predicate: string, object: string): void {
          
//           } }
//         />
//       )}
      
//     </div>
//   );
// };

// export default GraphPage;



import React, { useEffect, useState, useRef, useCallback } from "react";
import * as d3 from "d3";
import styles from "./GraphPage.module.css";
import { NewTripleMenu } from "./NewTriplet";
import OntologyManager from "../../shared/types/NodeManager";
import PredicateManager from "../../shared/types/PredicateManager";
import type { RDFLink } from "../../shared/types/graphTypes";
import graphData from '../../../public/input.json';

type NodeType = 'instance' | 'class' | 'property';

interface RDFNode {
  id: string;
  label: string;
  type: NodeType;
  children: RDFNode[];
}

const GraphPage: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [predicates, setPredicates] = useState<string[]>([]);
  const [nodes, setNodes] = useState<RDFNode[]>([]);
  const [links, setLinks] = useState<RDFLink[]>([]);

  // Обновление состояния из OntologyManager
  const updateDataFromManager = useCallback(() => {
    const allNodes = OntologyManager.getAllNodes();
    const allLinks = OntologyManager.getAllLinks();
    
    setNodes(allNodes.map(node => ({ ...node, children: [] })));
    setLinks(allLinks);
    setPredicates(OntologyManager.getAvailablePredicates());
  }, []);

  // Инициализация данных
  const initializeData = useCallback(() => {
    OntologyManager.clear();
    
    try {
      graphData.nodes.forEach(node => {
        OntologyManager.addNode({
          id: node.id,
          label: node.label,
          type: node.type as NodeType
        });
      });

      graphData.links.forEach(link => {
        OntologyManager.addLink(link.source, link.target, link.predicate);
      });

      updateDataFromManager();
    } catch (error) {
      console.error("Error loading graph data: ", error);
      const fallbackNode = {
        id: "http://www.w3.org/2000/01/rdf-schema#Class",
        label: "Class",
        type: "class",
        children: [],
      };
      OntologyManager.addNode(fallbackNode);
      updateDataFromManager();
    }
  }, [updateDataFromManager]);

  const buildTree = useCallback((nodes: RDFNode[], links: RDFLink[]): RDFNode | undefined => {
    const nodeMap = new Map<string, RDFNode>();
    nodes.forEach(node => nodeMap.set(node.id, {...node, children: [] }));

    links.forEach(link => {
      const parent = nodeMap.get(link.source);
      const child = nodeMap.get(link.target);
      if (parent && child) parent.children!.push(child);
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
  }, []);
  // Добавление нового узла
  const handleAddNode = useCallback((label: string, type: NodeType = 'class') => {
    const id = OntologyManager.generateNodeId(label);
    const newNode = { id, label, type, children: [] };
    OntologyManager.addNode(newNode);
    updateDataFromManager();
    return newNode;
  }, [updateDataFromManager]);

  // Добавление нового объекта
  const handleAddObject = useCallback((label: string) => {
    return handleAddNode(label, 'instance');
  }, [handleAddNode]);

  // Добавление новой связи
  const handleAddTriple = useCallback((
    subjectLabel: string, 
    predicate: string, 
    objectLabel: string
  ) => {
    let subject = OntologyManager.getNodeByLabel(subjectLabel);
    let object = OntologyManager.getNodeByLabel(objectLabel);

    if (!subject) subject = handleAddNode(subjectLabel);
    if (!object) object = handleAddObject(objectLabel);

    if (subject && object) {
      OntologyManager.addLink(subject.id, object.id, predicate);
      updateDataFromManager();
      return true;
    }
    return false;
  }, [handleAddNode, handleAddObject, updateDataFromManager]);

  // Отрисовка графа
  const renderTree = useCallback(() => {
    if (!nodes.length || !links.length) return;

    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;
    const g = svg.append('g');

    const hierarchyData = buildTree(nodes, links);

    if (!hierarchyData) return;

    const root = d3.hierarchy(hierarchyData);
    const treeLayout = d3.tree<RDFNode>()
      .size([height * 0.4, width * 0.4])
      .separation((a, b) => 0.5);

    treeLayout(root);

    // Стиль кнопок
    const buttonStyle = {
      width: 160,
      height: 40, 
      rx: 8,
      ry: 8,
      fill: "#ffffffff",
      stroke: "#000000ff",
      strokeWidth: 1
    };

    // Создание кнопок
    const createButton = (yPos: number, text: string, onClick: () => void) => {
      const button = svg.append('g')
        .attr("transform", `translate(20,${yPos})`) 
        .style("cursor", "pointer")
        .on("click", onClick)
        .on("mouseover", function() {
          d3.select(this).select("rect").attr("fill", "#c08bdcff");
        })
        .on("mouseout", function() {
          d3.select(this).select("rect").attr("fill", "#ffffffff");
        });

      button.append("rect")
        .attr("width", buttonStyle.width)
        .attr("height", buttonStyle.height)
        .attr("rx", buttonStyle.rx)
        .attr("ry", buttonStyle.ry)
        .attr("fill", buttonStyle.fill)
        .attr("stroke", buttonStyle.stroke)
        .attr("stroke-width", buttonStyle.strokeWidth)
        .attr("filter", "url(#button-shadow)");

      button.append("text")
        .attr("x", buttonStyle.width / 2)
        .attr("y", buttonStyle.height / 2 + 5)
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .attr("font-size", "14px")
        .attr("font-weight", "500")
        .text(text);
    };

    // Добавление кнопок
    createButton(height - 80, "Создать новый", () => setShowMenu(true));


    // Добавление тени для кнопок
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

    // Отрисовка связей
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", styles.link)
      .attr("d", d3.linkVertical()
        .x(d => d.x!)
        .y(d => d.y!))
      .attr("stroke-width", 1.5)
      .each(function(d) {
        const midX = (d.source.x! + d.target.x!) / 2;
        const midY = (d.source.y! + d.target.y!) / 2;
        
        const linkData = links.find(l => 
          l.source === d.source.data.id && l.target === d.target.data.id
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

    // Отрисовка узлов
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
      .attr("x", d => d.children ? -20 : 20)
      .style("text-anchor", d => d.children ? "end" : "start")
      .style("fill", "#333")
      .style("font-size", "14px")
      .text(d => d.data.label.length > 20 
        ? `${d.data.label.substring(0, 20)}...` 
        : d.data.label
      );

    // Добавление масштабирования
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any)
      .call(zoom.transform, d3.zoomIdentity.translate(width / 2, 60).scale(0.8));
  }, [nodes, links, buildTree]);
  // Эффекты инициализации и отрисовки
  useEffect(() => {
    initializeData();
    return () => {
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove();
      }
    };
  }, [initializeData]);

  useEffect(() => {
    renderTree();
  }, [nodes, links, renderTree]);

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
        <NewTripleMenu
          onClose={() => setShowMenu(false)}
          predicates={predicates}
          subjects={nodes.map(n => n.label)}
          objects={nodes.filter(n => n.type === 'instance').map(n => n.label)}
          onAddPredicate={(pred) => {
            PredicateManager.registerPredicate(pred);
            setPredicates(OntologyManager.getAvailablePredicates());
          }}
          onAddObject={handleAddObject}
          onAddTriple={handleAddTriple}
        />
      )}
    </div>
  );
};

export default GraphPage;