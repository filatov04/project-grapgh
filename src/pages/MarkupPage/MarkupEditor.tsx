import React from "react";
import styles from "./MarkupEditor.module.css";

const MarkupEditor: React.FC = () => {
  return (
    <div className={styles.markupEditor}>
      <div className={styles.content}>
        <h1>Редактор разметки</h1>
        <p>Здесь будет интерфейс для работы с разметкой данных</p>
        <div className={styles.placeholder}>
          <p>Функционал разметки находится в разработке</p>
        </div>
      </div>
    </div>
  );
};

export default MarkupEditor;
