import * as rdf from 'rdflib'
import { extractGraph } from './rdfGraphBuilder'
import type { RDFNode, RDFLink } from '../shared/types/graphTypes';

function parseRDFData(
  rdfString: string, 
  baseIRI = 'http://example.org/'
): { nodes: RDFNode[]; links: RDFLink[] } { 

    const store = rdf.graph()
    const contentType = 'text/turtle'
    
    try {
        rdf.parse(rdfString, store, baseIRI, contentType)
    } catch (error) {
        console.error('Error parsing RDF data:', error)
        throw new Error('Failed to parse RDF data')
    }

    const { nodes, links } = extractGraph(store);
    return { nodes, links };
}

export { parseRDFData };