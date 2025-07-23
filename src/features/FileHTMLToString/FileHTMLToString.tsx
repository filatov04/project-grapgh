import React, { useRef, useState } from "react";

interface FileHTMLToStringProps {
  onFileRead: (content: string) => void;
}

const FileHTMLToString: React.FC<FileHTMLToStringProps> = ({ onFileRead }) => {
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    setProgress(0);
    if (!file) return;
    if (!file.name.endsWith('.html')) {
      setError('Пожалуйста, выберите файл с расширением .html');
      return;
    }
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    reader.onload = () => {
      setProgress(100);
      if (typeof reader.result === 'string') {
        onFileRead(reader.result);
      }
    };
    reader.onerror = () => {
      setError('Ошибка при чтении файла');
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".html"
        onChange={handleFileChange}
      />
      {progress > 0 && (
        <div>Загрузка: {progress}%</div>
      )}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
};

export { FileHTMLToString };
