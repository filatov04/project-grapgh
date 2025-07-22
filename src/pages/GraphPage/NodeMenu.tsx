import React, {useState} from 'react';
import styles from './GraphPage.module.css';
import type { RDFNode } from '../../shared/types/graphTypes';
import OntologyManager from '../../shared/types/OntologyManager';
import { NewTripleMenu } from './NewTriplet';
import PredicateManager from '../../shared/types/PredicateManager';

const NodePopup: React.FC<{
  node: RDFNode;
  onClose: () => void;
  position: { x: number; y: number };
  onUpdate: () => void; 
}> = ({ node, position, onClose, onUpdate  }) => {
    const [showNewTripleMenu, setShowNewTripleMenu] = useState(false);
    const [predicates, setPredicates] = useState<string[]>([]);
    const [objects, setObjects] = useState<string[]>([]);

    const updateData = () => {
        setPredicates(OntologyManager.getAvailablePredicates());
        setObjects(
            OntologyManager.getAllNodes()
                .filter(n => n.id !== node.id)
                .map(n => n.label)
        );
    };

    React.useEffect(() => {
        updateData();
    }, [node.id]);

      const handleAddTriple = (subject: string, predicate: string, object: string) => {
    const subjectNode = OntologyManager.getNodeByLabel(subject);
    const objectNode = OntologyManager.getNodeByLabel(object);
    
    if (!subjectNode || !objectNode) {
      console.error("Не найдены узлы для субъекта или объекта");
      return false;
    }

    if (predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
      if (!subjectNode.type) {
        console.error("Субъект не имеет типа для наследования");
        return false;
      }

      let type = 'literal';
      if (subjectNode.label === 'Class') type = 'class';
      if (subjectNode.label === 'Property') type = 'property';

      OntologyManager.updateNodeType(objectNode.id, type);
    }

    OntologyManager.addLink(subjectNode.id, objectNode.id, predicate);
    onUpdate(); 
    updateData(); 
    setShowNewTripleMenu(false);
    return true;
  };

    const triples = OntologyManager.getAllTriplesWithNode(node.label);

    return (
        <div 
            className={styles.nodePopup}
            style={{
                left: `${position.x + 30}px`,
                top: `${position.y - 30}px`
            }}
            onClick={(e) => e.stopPropagation()} 
        >
            <div className={styles.popupHeader}>
                <h4 className={styles.nodeTitle}>{node.label}</h4>
            </div>
            
            <div className={styles.popupContent}>
                {triples.length > 0 ? (
                    <ul className={styles.triplesList}>
                        {triples.map((triple, index) => (
                            <li key={index} className={styles.tripleItem}>
                                <span className={styles.tripleSubject}>{triple.subject}</span>
                                <span className={styles.triplePredicate}>{triple.predicate}</span>
                                <span className={styles.tripleObject}>{triple.object}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Нет связанных триплетов</p>
                )}
            </div>

            <div className={styles.buttonRow}>
                <button 
                    className={styles.menuButton} 
                    onClick={() => setShowNewTripleMenu(true)}
                >
                    Создать триплет
                </button>
                <button className={styles.menuButton}>Удалить триплет</button>
                <button className={styles.menuButton}>Редактировать</button>
            </div>

            {showNewTripleMenu && (
                <NewTripleMenu
                    onClose={() => setShowNewTripleMenu(false)}
                    predicates={predicates}
                    subjects={[node.label]}
                    objects={objects}
                    initialSubject={node.label}
                    onAddPredicate={(pred) => {
                        PredicateManager.registerPredicate(pred);
                        updateData(); 
                    }}
                    onAddObject={(objectLabel) => {
                        const newNode = {
                            id: OntologyManager.generateNodeId(objectLabel),
                            label: objectLabel,
                            type: 'instance',
                            children: []
                        };
                        OntologyManager.addNode(newNode);
                        updateData(); 
                        return newNode;
                    }}
                    onAddTriple={handleAddTriple}
                />
            )}
        </div>
    );
};

export default NodePopup;