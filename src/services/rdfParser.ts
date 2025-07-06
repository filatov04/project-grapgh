import * as rdf from 'rdflib'
import { extractGraph } from './rdfGraphBuilder'
// rdflib это библиотечка которая позволяет работать с RDF данными в JavaScript
// Она предоставляет функции для хранения, парсинга строки в формате RDF и работы с графами данных
// и находить связи между объектами

export function parseRDFData(rdfString: string, baseIRI = 'http://example.org/') {
   // console.log("parseRDFData loaded");

    // создание пустового рдф-графа (той самой троицы)
    const store = rdf.graph()
    // нотация рдф-файла
    const contentType = 'text/turtle'
    
    try {
        rdf.parse(rdfString, store, baseIRI, contentType)
    } catch (error) {
        console.error('Error parsing RDF data:', error)
        throw new Error('Failed to parse RDF data')
    }

    const {nodes, links} = extractGraph(store);
    saveJSONToFile({nodes, links}, 'graph.json');

    return store
}

function saveJSONToFile(data: object, filename: string) {
    const blob = new Blob([JSON.stringify(data, null,2)], {
        type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}


