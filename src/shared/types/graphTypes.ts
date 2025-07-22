interface RDFNode {
  id: string;
  label: string;
  type: 'class' | 'property' | 'literal';
  children: RDFNode[];
  //depth: number;
}

interface RDFLink {
  source: string;
  target: string;
  predicate: string;
}

export type { RDFNode, RDFLink };