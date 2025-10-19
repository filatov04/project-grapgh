import { useCallback, type RefObject } from 'react';
import * as d3 from 'd3';
import type { OntologyNode } from '../../../shared/types/OntologyManager';
import type { RDFLink } from '../../../shared/types/graphTypes';
import styles from '../GraphPage.module.css';

export const useGraphRenderer = (
  svgRef: RefObject<SVGSVGElement | null>,
  nodes: OntologyNode[],
  links: RDFLink[],
  isSaving: boolean,
  setSelectedNode: (node: OntologyNode | null) => void,
  setPopupPosition: (pos: { x: number; y: number }) => void,
  handleSaveGraph: () => void,
  handleUploadClick: () => void,
  setShowMenu: (show: boolean) => void
) => {
  const buildTree = useCallback((nodes: OntologyNode[], links: RDFLink[]): OntologyNode | undefined => {
    // Создаем копии узлов без циклических ссылок
    const nodeMap = new Map<string, OntologyNode>();
    nodes.forEach(node => {
      nodeMap.set(node.id, {
        id: node.id,
        label: node.label,
        type: node.type,
        children: []
      });
    });

    // Отслеживаем добавленные связи для предотвращения дублирования и циклов
    const addedChildren = new Set<string>();
    
    links.forEach(link => {
      const parent = nodeMap.get(link.source);
      const child = nodeMap.get(link.target);
      
      // Проверяем что parent и child существуют и связь еще не добавлена
      const linkKey = `${link.source}->${link.target}`;
      if (parent && child && !addedChildren.has(linkKey)) {
        // Создаем копию child без циклических ссылок
        const childCopy: OntologyNode = {
          id: child.id,
          label: child.label,
          type: child.type,
          children: [] // Важно: создаем новый массив для детей
        };
        parent.children!.push(childCopy);
        addedChildren.add(linkKey);
      }
    });

    // Находим корневые узлы (те, которые не являются целью ни одной связи)
    const rootNodes = nodes.filter(node => !links.some(l => l.target === node.id));
    
    if (rootNodes.length === 0) {
      console.warn('No root nodes found, possible cyclic graph');
      // Если нет корневых узлов, берем первый узел
      return nodeMap.get(nodes[0]?.id);
    }
    
    if (rootNodes.length > 1) {
      return {
        id: "virtual_root",
        label: "Root",
        type: "class",
        children: rootNodes.map(node => nodeMap.get(node.id)!).filter(Boolean)
      };
    }

    return nodeMap.get(rootNodes[0].id);
  }, []);

  const renderTree = useCallback(() => {
    // Защита от пустых данных
    if (!nodes.length) {
      console.log('No nodes to render');
      return;
    }

    // Защита от слишком больших графов
    const MAX_NODES = 1000;
    if (nodes.length > MAX_NODES) {
      console.error(`Graph too large: ${nodes.length} nodes (max ${MAX_NODES})`);
      alert(`Граф слишком большой (${nodes.length} узлов). Максимум ${MAX_NODES} узлов для отображения.`);
      return;
    }

    const svgEl = svgRef.current;
    if (!svgEl) {
      console.log('SVG element not ready');
      return;
    }

    try {
      const svg = d3.select(svgEl);
      svg.selectAll("*").remove();

    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;
    const g = svg.append('g');

    const hierarchyData = buildTree(nodes, links);
    if (!hierarchyData) {
      console.log('No hierarchy data to render');
      return;
    }

    const root = d3.hierarchy(hierarchyData);
    const treeLayout = d3.tree<any>()
      .size([height * 3, width * 0.7])
      .separation(() => 1.5);

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
    createButton(height - 180, "Загрузить из файла", handleUploadClick);

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
      .data(root.links() as d3.HierarchyPointLink<OntologyNode>[])
      .enter()
      .append("path")
      .attr("class", styles.link)
      .attr("d", d3.linkVertical<any, any>()
        .x(d => d.x!)
        .y(d => d.y!))
      .attr("stroke-width", 1.5)
      .each(function(d: d3.HierarchyPointLink<OntologyNode>) {
        const source = d.source as d3.HierarchyPointNode<OntologyNode>;
        const target = d.target as d3.HierarchyPointNode<OntologyNode>;
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;

        const linkData = links.find(l =>
          l.source === source.data.id && l.target === target.data.id
        );

        if (linkData) {
          const label = linkData.predicate.split(/[#\/]/).pop() || linkData.predicate;

          // Создаем группу для метки
          const labelGroup = g.append("g");

          // Создаем временный текст для измерения размера
          const tempText = labelGroup.append("text")
            .attr("class", styles.linkLabel)
            .attr("x", midX)
            .attr("y", midY)
            .attr("text-anchor", "middle")
            .attr("dy", "-0.5em")
            .text(label);

          // Получаем размер текста
          const bbox = (tempText.node() as SVGTextElement).getBBox();
          const padding = 4;

          // Добавляем фоновый прямоугольник ПЕРЕД текстом
          labelGroup.insert("rect", "text")
            .attr("class", styles.linkLabelBackground)
            .attr("x", bbox.x - padding)
            .attr("y", bbox.y - padding)
            .attr("width", bbox.width + padding * 2)
            .attr("height", bbox.height + padding * 2);
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
      .attr("dy", "0")
      .attr("x", 0)
      .attr("y", 35)
      .style("text-anchor", "middle")
      .style("fill", "#222")
      .style("font-size", "12px")
      .style("font-weight", "600")
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
    
    } catch (error) {
      console.error('Error rendering tree:', error);
      // Очищаем SVG в случае ошибки
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
    }
  }, [nodes, links, buildTree, handleUploadClick, handleSaveGraph, isSaving, setSelectedNode, setPopupPosition, setShowMenu, svgRef]);

  return { renderTree };
};

