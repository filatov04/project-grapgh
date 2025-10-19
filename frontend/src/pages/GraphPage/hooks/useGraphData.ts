import { useState, useCallback } from 'react';
import { getGraph } from '../../../shared/api/graphApi';
import OntologyManager, { type OntologyNode, type NodeType } from '../../../shared/types/OntologyManager';

export const useGraphData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const initializeData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    OntologyManager.clear();
    
    try {
      const response = await getGraph();
      const data = response.data;
      console.log('Данные получены с сервера:', data);

      // Проверяем что данные корректны
      if (!data || !data.nodes || !Array.isArray(data.nodes) || !data.links || !Array.isArray(data.links)) {
        throw new Error('Сервер вернул данные в некорректном формате');
      }

      // Если граф пустой (новый пользователь или база данных пуста)
      if (data.nodes.length === 0 && data.links.length === 0) {
        console.log('Граф пуст - создаём начальный узел');
        const fallbackNode: OntologyNode = {
          id: "http://www.w3.org/2000/01/rdf-schema#Class",
          label: "Class",
          type: "class",
          children: [],
        };
        OntologyManager.addNode(fallbackNode);
        setIsLoading(false);
        return;
      }

      // Загружаем данные с сервера
      data.nodes.forEach(node => {
        OntologyManager.addNode({
          id: node.id,
          label: node.label,
          type: node.type as NodeType,
          children: []
        });
      });

      data.links.forEach(link => {
        OntologyManager.addLink(link.source, link.target, link.predicate);
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке графа с сервера:', error);
      
      // Формируем понятное сообщение об ошибке
      let errorMessage = 'Не удалось загрузить граф компетенций с сервера.';
      
      if (error instanceof Error) {
        errorMessage += ` ${error.message}`;
      }
      
      setLoadError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    loadError,
    initializeData
  };
};

