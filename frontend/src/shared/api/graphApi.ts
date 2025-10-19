import { api } from './customAxiosInstance';
import type { OntologyNode } from '../types/OntologyManager';
import type { RDFLink } from '../types/graphTypes';

interface GraphData {
  nodes: Omit<OntologyNode, 'children'>[];
  links: RDFLink[];
}

const postGraph = async (graphData: GraphData) => {
  return api.post('/competencies/graph', graphData);
}

const getGraph = async () => {
  return api.get<GraphData>('/competencies/graph');
}

export { postGraph, getGraph };
export type { GraphData };
