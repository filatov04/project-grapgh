import * as rdf from 'rdflib';
import type { RDFLink, RDFNode } from '../shared/types/graphTypes';

export function parseRDFData(
  rdfString: string,
  baseIRI = 'http://example.org/'
): { nodes: RDFNode[]; links: RDFLink[] } {
  const store = rdf.graph();
  rdf.parse(rdfString, store, baseIRI, 'text/turtle');

  const nodesMap = new Map<string, RDFNode>();
  const links: RDFLink[] = [];
  const childToParents = new Map<string, string[]>();

  const isRDFNode = (uri: string) =>
    uri.startsWith('http://www.w3.org/1999/02/22-rdf-syntax-ns#') ||
    uri.startsWith('http://www.w3.org/2000/01/rdf-schema#');

  store.match(null, null, null).forEach(triple => {
    if (triple.object.termType === 'Literal') return;

    if (triple.subject.termType === 'NamedNode' && isRDFNode(triple.subject.value)) {
      if (!nodesMap.has(triple.subject.value)) {
        const isProperty = triple.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
          triple.object.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Property';
        
        nodesMap.set(triple.subject.value, {
          id: triple.subject.value,
          label: triple.subject.value.split(/[#\/]/).pop() || triple.subject.value,
          type: isProperty ? 'property' : 'class',
          children: [],
          depth: -1
        });
      }
    }

    if (triple.object.termType === 'NamedNode' && isRDFNode(triple.object.value)) {
      if (!nodesMap.has(triple.object.value)) {
        nodesMap.set(triple.object.value, {
          id: triple.object.value,
          label: triple.object.value.split(/[#\/]/).pop() || triple.object.value,
          type: 'class',
          children: [],
          depth: -1
        });
      }
    }
  });

  const hierarchyPredicates = [
    'http://www.w3.org/2000/01/rdf-schema#subClassOf',
    'http://www.w3.org/2000/01/rdf-schema#domain',
    'http://www.w3.org/2000/01/rdf-schema#range',
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#first',
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'
  ];

  store.match(null, null, null).forEach(triple => {
    if (triple.subject.termType !== 'NamedNode' ||
      triple.object.termType !== 'NamedNode' ||
      !isRDFNode(triple.subject.value) ||
      !isRDFNode(triple.object.value)) return;

    if (triple.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
      triple.object.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Property') {
      const node = nodesMap.get(triple.subject.value);
      if (node) node.type = 'property';
    }

    if (hierarchyPredicates.includes(triple.predicate.value)) {
      if (!childToParents.has(triple.subject.value)) {
        childToParents.set(triple.subject.value, []);
      }
      childToParents.get(triple.subject.value)?.push(triple.object.value);

      links.push({
        source: triple.subject.value,
        target: triple.object.value,
        predicate: triple.predicate.value.split('#')[1]
      });
    }
  });

  const roots: RDFNode[] = [];
  const resourceNode = nodesMap.get('http://www.w3.org/2000/01/rdf-schema#Resource');
  if (resourceNode) {
    resourceNode.depth = 0;
    roots.push(resourceNode);
  }

  nodesMap.forEach((node, id) => {
    if (!childToParents.has(id) && id !== resourceNode?.id) {
      node.depth = 0;
      roots.push(node);
    }
  });

  const buildHierarchy = (node: RDFNode, currentDepth: number, visited: Set<string>) => {
    if (visited.has(node.id)) return;
    visited.add(node.id);

    node.depth = currentDepth;
    node.children = [];

    childToParents.forEach((parents, childId) => {
      if (parents.includes(node.id)) {
        const childNode = nodesMap.get(childId);
        if (childNode && !node.children.some(c => c.id === childId)) {
          node.children.push(childNode);
          buildHierarchy(childNode, currentDepth + 1, visited);
        }
      }
    });
  };

  const visited = new Set<string>();
  roots.forEach(root => buildHierarchy(root, root.depth, visited));

  nodesMap.forEach(node => {
    if (!visited.has(node.id)) {
      node.depth = 0;
      roots.push(node);
      buildHierarchy(node, 0, visited);
    }
  });

  return {
    nodes: Array.from(nodesMap.values()).filter(node =>
      node.id !== 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
    ),
    links
  };
}