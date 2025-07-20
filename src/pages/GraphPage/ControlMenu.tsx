import React, {useState} from 'react';
import styles from './GraphPage.module.css';

interface ControlMenuProps {
  onClose: () => void;
  predicates: string[];
  onAddPredicate: (newPredicate: string) => void;
}

export const ControlMenu: React.FC<ControlMenuProps> = ({ onClose, predicates, onAddPredicate }) => {
  const [newPredicate, setNewPredicate] = useState('');
  const [error, setError] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPredicate.trim()) {
      setError('Введите название предиката');
      return;
    }

     if (predicates.includes(newPredicate)) {
      setError('Такой предикат уже существует');
      return;
    }

    onAddPredicate(newPredicate);
    setNewPredicate('');
    setError('');
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Список предикатов</h3>
          <button 
            onClick={onClose} 
            className={styles.closeButton}
            aria-label="Закрыть"
          >
            x
          </button>
        </div>
 
        <div className={styles.predicatesList}>
          {predicates.map((predicate, index) => (
            <div key={index} className={styles.predicateItem}>
              <div className={styles.predicateText}>
                {predicate}
              </div>
            </div>
          ))}
        </div>


        <form onSubmit = {handleSubmit} className = {styles.predicateForm}>
          <input 
            type="text"
            value = {newPredicate}
            onChange={(e) => {
              setError('');
              setNewPredicate(e.target.value)
            }
            }
            placeholder = 'Новый предикат'
            className = {styles.predicateInput}
            required 
            />
             <button type="submit" className={styles.addPredicateButton}>
            Добавить
          </button>
               {error && <div className={styles.error}>{error}</div>}
        </form>


      </div>
    </div>
  );
};