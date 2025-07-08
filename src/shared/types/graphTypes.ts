interface RDFNode {
  id: string;
  label: string;
}
interface RDFLink {
  source: string;
  target: string;
  predicate: string;
}

export type { RDFNode, RDFLink };