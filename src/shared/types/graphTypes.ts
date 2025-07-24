
interface RDFNode {
  id: string;
  label: string;
  type: 'class' | 'property' | 'literal';
  children: RDFNode[];
  version: number;
  author: string;
}

interface RDFLink {
  source: string;
  target: string;
  predicate: string;
}

export type { RDFNode, RDFLink };