import React, { useState } from 'react';
import styles from './GraphPage.module.css';
import OntologyManager, { type OntologyNode } from '../../shared/types/OntologyManager';


interface DeleteNodeMenuProps {
  onClose: () => void;
  triples: {subject: string; predicate: string; object: string}[];
  onUpdate: (node: OntologyNode, newLabel: string) => void;
  node: OntologyNode;
  onDeleteConfirm: (nodeId: string) => void;
}

export const DeleteNodeMenu: React.FC<DeleteNodeMenuProps> = ({
  onClose,
  triples,
  onUpdate,
  node, 
  onDeleteConfirm,
}) => {
    
  const handleDelete = () => {
    onDeleteConfirm(node.id);
    onUpdate(node, node.label);
    onClose();
  };
  
//   return (
//     <div className={styles.modalOverlay} onClick = {onClose}>
//         <div className = {styles.deleteModalContent} onClick={(e) => e.stopPropagation()}>
//                 <div className={styles.formRow}>
//                         {triples.length > 0 ? (
//                         <ul className={styles.triplesListEditMode}>
//                             {triples.map((triple, index) => (
//                                 <div key={index} className={styles.tripleItemEditMode}>

//                                     <span>{triple.subject}</span>
//                                     <span>{triple.predicate}</span>
//                                     <span>{triple.object}</span>
                                    
//                                     <button type="submit" className={styles.saveButton}>
//                                         Сохранить
//                                     </button>



//                                 </div>
//                             ))}
//                         </ul>
//                     ) : (
//                         <p>Нет связанных триплетов</p>
//                     )}
//                 </div> 
//         </div>
//     </div>
//   );

 return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.deleteModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.deleteModalHeader}>
          <h3>Удаление узла</h3>
          <button onClick={onClose} className={styles.closeButton}>
            &times;
          </button>
        </div>

        <div className={styles.deleteModalBody}>
          <p>Вы уверены, что хотите удалить узел <strong></strong>?</p>
          
          {triples.length > 1 && (
            <div className={styles.affectedTriples}>
              <p>Будут удалены связанные триплеты:</p>
              <ul>
                {triples.map((triple, index) => (
                  <li key={index}>
                    {triple.subject} → {triple.predicate} → {triple.object}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.deleteModalFooter}>
          <button onClick={onClose} className={styles.cancelButton}>
            Отмена
          </button>
          <button onClick={handleDelete} className={styles.deleteButton}>
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
};