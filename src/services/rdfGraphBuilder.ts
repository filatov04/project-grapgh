
import * as rdf from 'rdflib'

export interface RDFNode {
  id: string;
  label: string;
}

export interface RDFLink {
  source: string;
  target: string;
  predicate: string;
}

function shortLabel(uri: string): string {
    const match = uri.match(/[#\/]([^#\/]+)$/);
    return match ? match[1] : uri;
}
    // rdf.Formula это типа контейнер для тех самых троек
export function extractGraph(store: rdf.Formula): {
  nodes: RDFNode[];
  links: RDFLink[];
} {
    const nodesMap = new Map<string, RDFNode>();
    const links: RDFLink[]= [];

    for (const triple of store.statements){

        if (triple.object.termType === 'Literal') continue;
        const subject = triple.subject.value;
        const predicate = triple.predicate.value
        const object =  triple.object.value;


        // добавляю узлы в граф
        if (!nodesMap.has(subject)) {
            nodesMap.set(subject, {
                id: subject,
                label: shortLabel(subject)
            });
        }

        if (!nodesMap.has(object)) {
            nodesMap.set(object, {
                id: object,
                label: shortLabel(object)
            });
        }

        // добавляю связи между узлами
        links.push({
            source: subject,
            target: object,
            predicate: shortLabel(predicate)
        });

        
    }
        return {
            nodes: Array.from(nodesMap.values()),
            links
        };
}