import React, { useState, useMemo, useEffect } from 'react';
import styles from './GraphPage.module.css';
import OntologyManager from '../../shared/types/OntologyManager';
import type { OntologyNode } from '../../shared/types/NodeManager';
import { postObject, postPredicate } from '../../shared/api/generalApi';

interface NewTripleMenuProps {
  onClose: () => void;
  subjects: string[];
  predicates: string[];
  objects: string[];
  onAddPredicate: (newPredicate: string) => void;
  onAddObject: (newObject: OntologyNode) => void;
  onAddTriple: (subject: string, predicate: string, object: string) => void;
}

export const NewTripleMenu: React.FC<NewTripleMenuProps> = ({
  onClose,
  subjects,
  objects: initialObjects,
  predicates: initialPredicates,
  onAddPredicate,
  onAddObject,
  onAddTriple
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

  // Состояния для поиска
  const [subjectSearch, setSubjectSearch] = useState('');
  const [predicateSearch, setPredicateSearch] = useState('');
  const [objectSearch, setObjectSearch] = useState('');

  // Фильтрация элементов
  const filteredSubjects = useMemo(() => {
    return subjects.filter(subject =>
      subject.toLowerCase().includes(subjectSearch.toLowerCase())
    );
  }, [subjects, subjectSearch]);

  const filteredPredicates = useMemo(() => {
    return localPredicates.filter(predicate =>
      predicate.toLowerCase().includes(predicateSearch.toLowerCase())
    );
  }, [localPredicates, predicateSearch]);

  const filteredObjects = useMemo(() => {
    return localObjects.filter(object =>
      object.toLowerCase().includes(objectSearch.toLowerCase())
    );
  }, [localObjects, objectSearch]);

  // Обработчики кликов
  const handleSubjectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDropDownSubOpen(prev => !prev);
    setSubjectSearch('');
    if (!isDropdownSubOpen) {
      setIsDropDownOpen(false);
      setIsDropDownObjOpen(false);
    }
  };

  const handlePredicateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDropDownOpen(prev => !prev);
    setPredicateSearch('');
    if (!isDropdownOpen) {
      setIsDropDownSubOpen(false);
      setIsDropDownObjOpen(false);
    }
  };

  const handleObjectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDropDownObjOpen(prev => !prev);
    setObjectSearch('');
    if (!isDropdownObjOpen) {
      setIsDropDownSubOpen(false);
      setIsDropDownOpen(false);
    }
  };

  // Закрытие при клике вне компонента
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Исправленное условие - добавлены закрывающие скобки и точка с запятой
    if (!target.closest(`.${styles.scrollableDropdownMenu}`) && 
        !target.closest(`.${styles.predicateDropdownTrigger}`)) {
      setIsDropDownSubOpen(false);
      setIsDropDownOpen(false);
      setIsDropDownObjOpen(false);
    }
  };

  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
}, []);

  // Остальные обработчики
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
    // (async () => {
    //   try {
    //     const response = await postPredicate(newPredicate);
    //     console.log('response from server', response);
    //   } catch (error) {
    //     console.error('Ошибка при добавлении объекта:', error);
    //   }
    // })();
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

    try {
      const addedNode = onAddObject(newObject.trim());
      
      if (!addedNode) {
        throw new Error('Не удалось добавить узел');
      }

      setLocalObjects(prev => [...prev, addedNode.label]);
      // (async () => {
      //   try {
      //     const response = await postObject(newObject);
      //     console.log('response from server', response);
      //   } catch (error) {
      //     console.error('Ошибка при добавлении объекта:', error);
      //   }
      // })();
      setNewObject('');
      setError('');
      setSelectedObject(addedNode.label);
      
      console.log('Добавленный узел:', addedNode);
    } catch (error) {
      console.error('Ошибка добавления:', error);
      setError('Ошибка при создании объекта');
    }
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

  const handleApply = () => {
    if (selectedSubject && selectedPredicate && selectedObject) {
      onAddTriple(selectedSubject, selectedPredicate, selectedObject);
      onClose();
    } else {
      setError('Выберите субъект, предикат и объект');
    }
  };

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
                    onClick={handleSubjectClick}
                    tabIndex={0}
                  >
                    {selectedSubject || 'Выберите субъект'}
                    <span className={styles.arrow}>
                      {isDropdownSubOpen ? '▲' : '▼'}
                    </span>
                  </div>

                  {isDropdownSubOpen && (
                    <div className={styles.scrollableDropdownMenu}>
                      <input
                        type="text"
                        placeholder="Поиск субъекта..."
                        className={styles.searchInput}
                        value={subjectSearch}
                        onChange={(e) => setSubjectSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                      {filteredSubjects.map((subject) => (
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
                      {filteredSubjects.length === 0 && (
                        <div className={styles.noItems}>Ничего не найдено</div>
                      )}
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
                    onClick={handlePredicateClick}
                    tabIndex={0}
                  >
                    {selectedPredicate || 'Выберите предикат'}
                    <span className={styles.arrow}>
                      {isDropdownOpen ? '▲' : '▼'}
                    </span>
                  </div>

                  {isDropdownOpen && (
                    <div className={styles.scrollableDropdownMenu}>
                      <input
                        type="text"
                        placeholder="Поиск предиката..."
                        className={styles.searchInput}
                        value={predicateSearch}
                        onChange={(e) => setPredicateSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                      {filteredPredicates.map((predicate) => (
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
                      {filteredPredicates.length === 0 && (
                        <div className={styles.noItems}>Ничего не найдено</div>
                      )}
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
                    onClick={handleObjectClick}
                    tabIndex={0}
                  >
                    {selectedObject || 'Выберите объект'}
                    <span className={styles.arrow}>
                      {isDropdownObjOpen ? '▲' : '▼'}
                    </span>
                  </div>

                  {isDropdownObjOpen && (
                    <div className={styles.scrollableDropdownMenu}>
                      <input
                        type="text"
                        placeholder="Поиск объекта..."
                        className={styles.searchInput}
                        value={objectSearch}
                        onChange={(e) => setObjectSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                      {filteredObjects.length > 0 ? (
                        filteredObjects.map((object) => (
                          <div
                            key={object}
                            className={`${styles.predicateOption} ${
                              selectedObject === object ? styles.selected : ''
                            }`}
                            onClick={() => {
                              handleObjectSelect(object);
                              setIsDropDownObjOpen(false);
                            }}
                          >
                            {object}
                          </div>
                        ))
                      ) : (
                        <div className={styles.noItems}>Ничего не найдено</div>
                      )}
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

          <button 
            onClick={handleApply}
            className={styles.addButton}
            aria-label="Применить"
            disabled={!selectedSubject || !selectedPredicate || !selectedObject}
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};