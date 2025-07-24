import React, { useEffect, useState, useRef, useCallback } from "react";
import * as d3 from "d3";
import styles from "./GraphPage.module.css";
import { NewTripleMenu } from "./NewTriplet";
import OntologyManager, { type OntologyNode } from "../../shared/types/OntologyManager";
import PredicateManager from "../../shared/types/PredicateManager";
import type { RDFLink } from "../../shared/types/graphTypes";
import { postGraph, type GraphData } from "../../shared/api/graphApi";
import graphData from '../../../public/input.json';
import NodePopup from "./NodePopup";
import { EditNode } from "./EditNode";
import { type NodeType } from "../../shared/types/OntologyManager";


const GraphPage: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [predicates, setPredicates] = useState<string[]>([]);
  const [nodes, setNodes] = useState<OntologyNode[]>([]);
  const [links, setLinks] = useState<RDFLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<OntologyNode | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);

  
  const updateDataFromManager = useCallback(() => {
    const allNodes = OntologyManager.getAllNodes();
    const allLinks = OntologyManager.getAllLinks();
    setNodes(allNodes); 
    setLinks(allLinks); // это по факту все связи
    setPredicates(OntologyManager.getAvailablePredicates()); // а это список уникальных
  }, []);

  
  const initializeData = useCallback(() => {
    OntologyManager.clear();
    
    try {
      graphData.nodes.forEach(node => {
        OntologyManager.addNode({
          id: node.id,
          label: node.label,
          type: node.type as NodeType,
          children: []
        });
        // TODO: сделать запрос на сервер
        console.log("запрос на сервер при добавлении узла пока не отправляется");
      });

      graphData.links.forEach(link => {
        OntologyManager.addLink(link.source, link.target, link.predicate);
      });

      updateDataFromManager();
    } catch (error) {
      console.error("Error loading graph data: ", error);
      const fallbackNode: OntologyNode = {
        id: "http://www.w3.org/2000/01/rdf-schema#Class",
        label: "Class",
        type: "class",
        children: [],
      };
      OntologyManager.addNode(fallbackNode);
      updateDataFromManager();
    }
  }, [updateDataFromManager]);

  const buildTree = useCallback((nodes: OntologyNode[], links: RDFLink[]): OntologyNode | undefined => {
    const nodeMap = new Map<string, OntologyNode>();
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


  const handleSaveGraph = async () => {
    setIsSaving(true);
    try {
      const nodesToSave = nodes.map(({ children, ...rest }) => rest);
      const graphData: GraphData = {
        nodes: nodesToSave,
        links: links,
      };
      await postGraph(graphData);
      alert('Граф успешно сохранен!');
    } catch (error) {
      console.error('Ошибка при сохранении графа:', error);
      alert('Не удалось сохранить граф.');
    } finally {
      setIsSaving(false);
    }
  };
  
 const handleAddTriple = useCallback((
    subjectLabel: string,
    predicateLabel: string,
    objectLabel: string
  ) => {

    const subject = OntologyManager.getNodeByLabel(subjectLabel);
    const object = OntologyManager.getNodeByLabel(objectLabel);
    console.log("subject", subject, "object", object)
    if (!subject || !object) {
      console.error("Не найдены узлы для субъекта или объекта");
      return false;
    }
    if (predicateLabel === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
      if (!subject.type) {
        console.error("Субъект не имеет типа для наследования");
        return false;
      }

      let type = 'literal';

      if (subject.label === 'Class'){
        type = 'class';
      }

      if (subject.label == 'Property') {
        type = 'property';
      }

      const typeUpdated = OntologyManager.updateNodeType(object.id, type as NodeType);
      if (!typeUpdated) {
        console.error("Не удалось изменить тип объекта");
        return false;
      }
        
    }
    const linkAdded = OntologyManager.addLink(subject.id, object.id, predicateLabel); 
    if (linkAdded) {
      updateDataFromManager();
    return true;
  }

  }, [updateDataFromManager]);

  
    const renderTree = useCallback(() => {
      if (!nodes.length || !links.length) return;

      const svgEl = svgRef.current;
      if (!svgEl) return;

      const svg = d3.select(svgEl);
      svg.selectAll("*").remove();

      const width = svgEl.clientWidth;
      const height = svgEl.clientHeight;
      const g = svg.append('g');

      //console.log(nodes,links);
      const hierarchyData = buildTree(nodes, links);

      if (!hierarchyData) return;

      const root = d3.hierarchy(hierarchyData);
      const treeLayout = d3.tree<any>()
        .size([height * 2, width * 0.5])
        .separation((a, b) => 0.8);

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
      const createButton = (yPos: number, text: string, onClick: () => void, disabled = false) => {
        const button = svg.append('g')
          .attr("transform", `translate(20,${yPos})`) 
          .style("cursor", disabled ? "not-allowed" : "pointer")
          .on("click", onClick);
          
        if (disabled) {
          button.style("pointer-events", "none");
        }

        button.on("mouseover", function() {
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

        const textElement = button.append("text")
          .attr("x", buttonStyle.width / 2)
          .attr("y", buttonStyle.height / 2 + 5)
          .attr("text-anchor", "middle")
          .attr("fill", "black")
          .attr("font-size", "14px")
          .attr("font-weight", "500");
          
        if (isSaving && text === "Сохранить") {
          textElement.text("Сохранение...");
        } else {
          textElement.text(text);
        }
      };

      // Добавление кнопок
      createButton(height - 80, "Создать новый", () => setShowMenu(true));
      createButton(height - 130, "Сохранить", handleSaveGraph, isSaving);


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
        .attr("d", d3.linkVertical<any>()
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
        .attr("class", (d: any) => `${styles.node} ${styles[d.data.type]}`)
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);

      nodeGroups.on("click", function(event, d: any) {
        event.stopPropagation();
        setSelectedNode(d.data);
        setPopupPosition({ x: event.clientX, y: event.clientY });
      });


      nodeGroups.append("circle")
        .attr("r", 20)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

      nodeGroups.append("text")
        .attr("dy", ".31em")
        .attr("x", (d: any) => d.children ? -20 : 20)
        .style("text-anchor", (d: any) => d.children ? "end" : "start")
        .style("fill", "#333")
        .style("font-size", "14px")
        .text((d: any) => d.data.label.length > 20 
          ? `${d.data.label.substring(0, 20)}...` 
          : d.data.label
        );

      // Добавление масштабирования
      const zoom = d3.zoom<any, any>()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });

      svg.call(zoom)
        .call(zoom.transform, d3.zoomIdentity.translate(width / 2, 60).scale(0.8));
    }, [nodes, links, buildTree, isSaving]);


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
  }, [nodes, links, renderTree, isSaving]);

  useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (selectedNode && !(e.target as HTMLElement).closest(`.${styles.nodePopup}`)) {
      setSelectedNode(null);
    }
  };
  
  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
}, [selectedNode]);

  return (
    <div className={styles["graph-page"]}>
      <div className={styles["graph-page__content"]}>
        <svg
          ref={svgRef}
          className={styles["graph-page__svg"]}
          width="100%"
          height="100%"
        />
      </div>
      {showMenu && (
        <NewTripleMenu
          onClose={() => setShowMenu(false)}
          predicates={predicates}
          subjects={nodes.map(n => n.label)}
          objects={nodes.map(n => n.label)}
          
          onAddPredicate={(pred) => {
            PredicateManager.registerPredicate(pred);
            setPredicates(OntologyManager.getAvailablePredicates());
          }}

          onAddObject={(objectLabel) => {
            const newNode = {
              label: objectLabel,
              type: undefined, 
              children: []
            };

            OntologyManager.addNode(newNode as any);
            const updatedNodes = OntologyManager.getAllNodes();
            setNodes(updatedNodes);
            console.log('Все узлы после добавления:', updatedNodes);
            return newNode;
           }}
          onAddTriple={handleAddTriple}
        />
      )}

      {selectedNode && (
      <NodePopup 
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        position={popupPosition}
        onUpdate={updateDataFromManager} 
        setSelectedNode={setSelectedNode}
      />
    )}
    </div>
  );
};

export default GraphPage;