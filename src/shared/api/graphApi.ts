import { api } from './customAxiosInstance';

interface OntologyNode {
  id: string;
  label: string;
  type: 'class' | 'property' | 'instance';
  author: string;
  version: number;
};

interface RDFLink {
  id: string;
  source: string;
  target: string;
  predicate: string;
}

// Добавить узел
const addOntologyNode = async (node: OntologyNode) => {
  return api.post<OntologyNode>('/graph/node', node);
};

// Удалить узел
const deleteOntologyNode = async (nodeId: string) => {
  return api.delete(`/graph/node/${nodeId}`);
};

// Обновить узел
const updateOntologyNode = async (node: OntologyNode) => {
  return api.put<OntologyNode>(`/graph/node/${node.id}`, node);
};

// Добавить связь
const addRDFLink = async (link: RDFLink) => {
  return api.post<RDFLink>('/graph/link', link);
};

// Удалить связь
const deleteRDFLink = async (linkId: string) => {
  return api.delete(`/graph/link/${linkId}`);
};

// Обновить связь
const updateRDFLink = async (link: RDFLink) => {
  return api.put<RDFLink>(`/graph/link/${link.id}`, link);
};

export {
  addOntologyNode,
  deleteOntologyNode,
  updateOntologyNode,
  addRDFLink,
  deleteRDFLink,
  updateRDFLink,
};
