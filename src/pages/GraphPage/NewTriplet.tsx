import React, { useState } from 'react';
import styles from './GraphPage.module.css';

interface NewTripleMenuProps {
  onClose: () => void;
  subjects: string[];
  predicates: string[];
  objects: string[];
  onAddPredicate: (newPredicate: string) => void;
  onAddObject: (newObject: string) => void;
  onAddTriple: (subject: string, predicate: string, object: string) => void;
}

export const NewTripleMenu: React.FC<NewTripleMenuProps> = ({
  onClose,
  subjects,
  objects: initialObjects,
  predicates: initialPredicates,
  onAddPredicate,
  onAddObject,
  //onAddTriple
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedPredicate, setSelectedPredicate] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  
  const [isDropdownSubOpen, setIsDropDownSubOpen] = useState(false);
  const [isDropdownOpen, setIsDropDownOpen] = useState(false);
  const [isDropdownObjOpen, setIsDropDownObjOpen] = useState(false);
  
  const [newPredicate, setNewPredicate] = useState('');
  const [newObject, setNewObject] = useState('');
  const [error, setError] = useState('');
  
  const [localPredicates, setLocalPredicates] = useState(initialPredicates);
  const [localObjects, setLocalObjects] = useState(initialObjects);

  const handleSubmitPredicate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPredicate.trim()) {
      setError('Введите название предиката');
      return;
    }
    
    if (localPredicates.includes(newPredicate)) {
      setError('Такой предикат уже существует');
      return;
    }
    
    const updatedPredicates = [...localPredicates, newPredicate];
    setLocalPredicates(updatedPredicates);
    onAddPredicate(newPredicate);
    setNewPredicate('');
    setError('');
    setSelectedPredicate(newPredicate);
  };

  const handleSubmitObject = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newObject.trim()) {
      setError('Введите название объекта');
      return;
    }

    if (localObjects.includes(newObject)) {
      setError('Такой объект уже существует');
      return;
    }
    
    const updatedObjects = [...localObjects, newObject];
    setLocalObjects(updatedObjects); // Обновляем локальный список объектов
    onAddObject(newObject);
    setNewObject('');
    setError('');
    setSelectedObject(newObject);
    setIsDropDownObjOpen(true); // Открываем dropdown после добавления
  };

  const handlePredicateSelect = (predicate: string) => {
    setSelectedPredicate(predicate);
    setIsDropDownOpen(false);
  };

  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    setIsDropDownSubOpen(false);
  };

  const handleObjectSelect = (object: string) => {
    setSelectedObject(object);
    setIsDropDownObjOpen(false);
  };

//   const handleApply = () => {
//     if (selectedSubject && selectedPredicate && selectedObject) {
//       onAddTriple(selectedSubject, selectedPredicate, selectedObject);
//       onClose();
//     } else {
//       setError('Выберите субъект, предикат и объект');
//     }
//   };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={onClose} 
          className={styles.closeButton}
          aria-label="Закрыть"
        >
          &times;
        </button>

        <div className={styles.contentArea}>
          <div className={styles.rectContainer}>
            <div className={styles.rectRow}>
              {/* Субъект */}
              <div className={styles.smallRect}>
                <h3 className={styles.rectTitle}>Субъект</h3>
                <div className={styles.predicateDropdownContainer}>
                  <div
                    className={styles.predicateDropdownTrigger}
                    onClick={() => setIsDropDownSubOpen(!isDropdownSubOpen)}
                  >
                    {selectedSubject || 'Выберите субъект'}
                    <span className={styles.arrow}>
                      {isDropdownSubOpen ? '▲' : '▼'}
                    </span>
                  </div>

                  {isDropdownSubOpen && (
                    <div className={styles.predicateDropdownMenu}>
                      {subjects.map((subject) => (
                        <div
                          key={subject}
                          className={`${styles.predicateOption} ${
                            selectedSubject === subject ? styles.selected : ''
                          }`}
                          onClick={() => handleSubjectSelect(subject)}
                        >
                          {subject}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Предикат */}
              <div className={styles.smallRect}>
                <h3 className={styles.rectTitle}>Предикат</h3>
                <div className={styles.predicateDropdownContainer}>
                  <div
                    className={styles.predicateDropdownTrigger}
                    onClick={() => setIsDropDownOpen(!isDropdownOpen)}
                  >
                    {selectedPredicate || 'Выберите предикат'}
                    <span className={styles.arrow}>
                      {isDropdownOpen ? '▲' : '▼'}
                    </span>
                  </div>

                  {isDropdownOpen && (
                    <div className={styles.predicateDropdownMenu}>
                      {localPredicates.map((predicate) => (
                        <div
                          key={predicate}
                          className={`${styles.predicateOption} ${
                            selectedPredicate === predicate ? styles.selected : ''
                          }`}
                          onClick={() => handlePredicateSelect(predicate)}
                        >
                          {predicate}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmitPredicate} className={styles.predicateForm}>
                  <input 
                    type="text"
                    value={newPredicate}
                    onChange={(e) => {
                      setError('');
                      setNewPredicate(e.target.value);
                    }}
                    placeholder="Новый предикат"
                    className={styles.predicateInput}
                    required 
                  />
                  <button type="submit" className={styles.addPredicateButton}>
                    Добавить
                  </button>
                </form>
              </div>
              
              {/* Объект */}
              <div className={styles.smallRect}>
                <h3 className={styles.rectTitle}>Объект</h3>
                <div className={styles.predicateDropdownContainer}>
                  <div
                    className={styles.predicateDropdownTrigger}
                    onClick={() => setIsDropDownObjOpen(!isDropdownObjOpen)}
                  >
                    {selectedObject || 'Выберите объект'}
                    <span className={styles.arrow}>
                      {isDropdownObjOpen ? '▲' : '▼'}
                    </span>
                  </div>

                  {isDropdownObjOpen && (
                    <div className={styles.predicateDropdownMenu}>
                      {localObjects.map((object) => ( // Используем localObjects вместо initialObjects
                        <div
                          key={object}
                          className={`${styles.predicateOption} ${
                            selectedObject === object ? styles.selected : ''
                          }`}
                          onClick={() => handleObjectSelect(object)}
                        >
                          {object}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmitObject} className={styles.predicateForm}>
                  <input 
                    type="text"
                    value={newObject}
                    onChange={(e) => {
                      setError('');
                      setNewObject(e.target.value);
                    }}
                    placeholder="Новый объект"
                    className={styles.predicateInput}
                    required 
                  />
                  <button type="submit" className={styles.addPredicateButton}>
                    Добавить
                  </button>
                </form>
              </div>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          
        </div>
        <button 
            onClick={onClose}
            className={styles.addButton}
            aria-label="Применить"
            disabled={!selectedSubject || !selectedPredicate || !selectedObject}
          >
            Применить
          </button>
      </div>
    </div>
  );
};