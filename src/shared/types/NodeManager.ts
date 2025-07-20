import PredicateManager from "./PredicateManager";
import type { RDFLink } from "./graphTypes";

export type OntologyNode = {
  id: string;
  label: string;
  type: 'class' | 'property' | 'instance';
  children?: OntologyNode[]; 
};

class OntologyManager {
  private static instance: OntologyManager;
  private nodes: Map<string, OntologyNode>;
  private links: Set<RDFLink>;

  private constructor() {
    this.nodes = new Map();
    this.links = new Set();
  }

  public static getInstance(): OntologyManager {
    if (!OntologyManager.instance) {
      OntologyManager.instance = new OntologyManager();
    }
    return OntologyManager.instance;
  }

    public clear(): void {
    this.nodes.clear();
    this.links.clear();
    PredicateManager.clear(); // Если нужно очистить и предикаты
  }

  public addNode(node: OntologyNode): OntologyNode {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, node);
    }
    return this.nodes.get(node.id)!;
  }

  public addLink(sourceId: string, targetId: string, predicate: string): boolean {
    if (this.nodes.has(sourceId) && this.nodes.has(targetId)) {
      PredicateManager.registerPredicate(predicate);
      this.links.add({ source: sourceId, target: targetId, predicate });
      return true;
    }
    return false;
  }

  public getAllLinks(): RDFLink[] {
    return Array.from(this.links);
  }

  public getNode(nodeId: string): OntologyNode | undefined {
    return this.nodes.get(nodeId);
  }

  public getNodeByLabel(label: string): OntologyNode | undefined {
  return Array.from(this.nodes.values()).find(node => node.label === label);
}

  public getAllNodes(): OntologyNode[] {
    return Array.from(this.nodes.values());
  }

  public getAvailablePredicates(): string[] {
    return PredicateManager.getAllPredicates();
  }

  public getConnectableNodes(): OntologyNode[] {
    return this.getAllNodes().filter(node => node.type !== 'property');
  }

  public generateNodeId(label: string): string {
    const baseId = label.replace(/\s+/g, '_');
    let id = baseId;
    let counter = 1;
    
    while (this.nodes.has(id)) {
      id = `${baseId}_${counter}`;
      counter++;
    }
    
    return id;
  }
}

export default OntologyManager.getInstance();