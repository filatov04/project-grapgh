import { useCallback, type RefObject } from 'react';
import OntologyManager, { type NodeType } from '../../../shared/types/OntologyManager';

export const useFileUpload = (
  fileInputRef: RefObject<HTMLInputElement | null>,
  updateDataFromManager: () => void
) => {
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const jsonData = JSON.parse(content);

        // Валидация структуры файла
        if (!jsonData.nodes || !jsonData.links) {
          alert("Неверный формат файла. Ожидаются поля nodes и links.");
          return;
        }

        // Очищаем текущие данные
        OntologyManager.clear();

        // Загружаем новые данные
        jsonData.nodes.forEach((node: any) => {
          OntologyManager.addNode({
            id: node.id,
            label: node.label,
            type: node.type as NodeType,
            children: []
          });
        });

        jsonData.links.forEach((link: any) => {
          OntologyManager.addLink(link.source, link.target, link.predicate);
        });

        updateDataFromManager();
        alert("Граф успешно загружен из файла!");

        // Очищаем input для возможности загрузки того же файла снова
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        console.error("Ошибка при чтении файла:", error);
        alert("Не удалось прочитать файл. Проверьте формат JSON.");
      }
    };
    reader.readAsText(file);
  }, [updateDataFromManager, fileInputRef]);

  const handleUploadClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [fileInputRef]);

  return {
    handleFileUpload,
    handleUploadClick
  };
};

