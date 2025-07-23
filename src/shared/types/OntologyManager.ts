import { version } from "react";
import PredicateManager from "./PredicateManager";
import type { RDFLink, RDFNode } from "./graphTypes";

export type OntologyNode = {
  id: string;
  label: string;
  type: 'class' | 'property' | 'literal ';
  children?: OntologyNode[]; 
  author: string;
  version: number;
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
    PredicateManager.clear(); 
  }

  public updateNodeType(nodeId: string, newType: OntologyNode['type']): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    
    
    const updatedNode = { ...node, type: newType };
    this.nodes.set(nodeId, updatedNode); 
    
    return true;
  }



  public updateNodeLabel(nodeId: string, newLabel: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;


    let newId: string;
    const hashIndex = nodeId.indexOf('#');
    
    if (hashIndex !== -1) {
        newId = nodeId.substring(0, hashIndex + 1) + newLabel;
    } else {
        newId = newLabel;
    }


    const updatedNode = { 
        ...node, 
        id: newId, 
        label: newLabel 
    };


    this.nodes.delete(nodeId);
    this.nodes.set(newId, updatedNode);


    if (this.links instanceof Map) {
        const newLinks = new Map<string, RDFLink>();
        
        this.links.forEach((link, key) => {
            if (link.source === nodeId) {
                newLinks.set(key, { ...link, source: newId });
            } else if (link.target === nodeId) {
                newLinks.set(key, { ...link, target: newId });
            } else {
                newLinks.set(key, link);
            }
        });
        
        this.links = newLinks;
    } 

    else if (this.links instanceof Set) {
        const newLinks = new Set<RDFLink>();
        
        this.links.forEach(link => {
            if (link.source === nodeId) {
                newLinks.add({ ...link, source: newId });
            } else if (link.target === nodeId) {
                newLinks.add({ ...link, target: newId });
            } else {
                newLinks.add(link);
            }
        });
        
        this.links = newLinks;
    }

    else if (Array.isArray(this.links)) {
        this.links = this.links.map(link => {
            if (link.source === nodeId) {
                return { ...link, source: newId };
            }
            if (link.target === nodeId) {
                return { ...link, target: newId };
            }
            return link;
        });
    } else {
        console.error('Неизвестный тип для this.links:', this.links);
        return false;
    }


    this.nodes.forEach(n => {
        if (n.children) {
            const childIndex = n.children.findIndex(child => child.id === nodeId);
            if (childIndex !== -1) {
                const updatedChildren = [...n.children];
                updatedChildren[childIndex] = updatedNode;
                this.nodes.set(n.id, { ...n, children: updatedChildren });
            }
        }
    });

    return true;
}


  public addNode(node: OntologyNode): OntologyNode {
    if (!this.nodes.has(node.id)) {
      const newNode = {
        ...node,
        version: 0,
        author: 'noname',
        children: node.children || []
      };
      this.nodes.set(node.id, newNode);
      console.log('Узел добавлен в OntologyManager:', newNode); 
      return newNode;
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
  public getLinkByLabel(label: string): RDFLink | undefined {
  return Array.from(this.links).find(link => link.predicate === label);
}


  public getAllNodes(): OntologyNode[] {
    return Array.from(this.nodes.values());
  }

public getAvailablePredicates(): string[] {

  const managerPredicates = PredicateManager.getAllPredicates();

  const propertyNodes = Array.from(this.nodes.values())
    .filter(node => node.type === 'property')
    .map(node => node.label);

  const uniquePredicates = [...new Set([...managerPredicates, ...propertyNodes])];
  
  return uniquePredicates;
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

  public getPrefixFromUri(uri: string): string {
    const knownPrefixes = {
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'rdf:',
      'http://www.w3.org/2000/01/rdf-schema#': 'rdfs:',
      'http://www.w3.org/2002/07/owl#': 'owl:',
      'http://purl.org/dc/elements/1.1/': 'dc:'
    };
    for (const [baseUri, prefix] of Object.entries(knownPrefixes)) {
      if (uri.startsWith(baseUri)) {
        return prefix + uri.slice(baseUri.length);
      }
    }
    const shortName = uri.includes('#') 
      ? uri.split('#')[1] 
      : uri.split('/').pop() || uri;
    
  return shortName;
}

public getAllTriplesWithNode(label: string): { subject: string; predicate: string; object: string }[] {
  const node = this.getNodeByLabel(label);
  if (!node) return [];

  const relatedLinks = Array.from(this.links).filter(
    link => link.source === node.id || link.target === node.id
  );

  return relatedLinks.map(link => {
    const subjectNode = this.getNode(link.source);
    const objectNode = this.getNode(link.target);
    
    return {
      subject: subjectNode ? this.getPrefixFromUri(subjectNode.id) : link.source,
      predicate: this.getPrefixFromUri(link.predicate),
      object: objectNode ? this.getPrefixFromUri(objectNode.id) : link.target
    };
  });
}
public deleteNode(nodeId: string): boolean {
    const nodeToDelete = this.nodes.get(nodeId);
    if (!nodeToDelete) {
        console.warn(`Node with id ${nodeId} not found`);
        return false;
    }

    const linksToDelete = new Set<RDFLink>();
    this.links.forEach(link => {
        if (link.source === nodeId || link.target === nodeId) {
            linksToDelete.add(link);
        }
    });

    linksToDelete.forEach(link => {
        this.links.delete(link);
    });

    this.nodes.forEach(node => {
        if (node.children) {
            node.children = node.children.filter(child => child.id !== nodeId);
        }
    });

    this.nodes.delete(nodeId);

    return true;
}


}

export default OntologyManager.getInstance();