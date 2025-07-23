import React, { useState, useMemo, useRef } from 'react';
import type { FC, ChangeEvent, MouseEvent } from 'react';
import './CommentableText.css';

import parse from 'html-react-parser';
import { FileHTMLToString } from '../../features/FileHTMLToString/FileHTMLToString';

type TripletType = 'S' | 'O' | 'R' | null;

// TODO: добавить типы для комментариев
interface Comment {
  id: number;
  text: string;
  startIndex: number;
  endIndex: number;
  tripletType: TripletType;
  predicate?: string;
  object?: string;
  createdAt?: Date;
  author?: string;
}

interface SelectionData {
  startIndex: number;
  endIndex: number;
  rect: DOMRect;
}

interface HoveredCommentData {
  comment: Comment;
  rect: DOMRect;
}

interface CommentInputPopupProps {
  position: { x: number; y: number };
  onSave: (commentText: string, tripletType: TripletType) => void;
  onCancel: () => void;
}

const CommentInputPopup: FC<CommentInputPopupProps> = ({ position, onSave, onCancel }) => {
  const [commentText, setCommentText] = useState<string>('');
  const [tripletType, setTripletType] = useState<TripletType>(null);

  const handleSave = () => {
    // Разрешаем сохранение если есть текст комментария ИЛИ выбран тип триплета
    if (commentText.trim() || tripletType) {
      onSave(commentText, tripletType);
    }
  };

  const handleTripletTypeClick = (type: TripletType) => {
    setTripletType(type);
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setCommentText(e.target.value);
  };

  return (
    <div className="comment-popup" style={{ top: position.y, left: position.x }}>
      <div className="triplet-buttons">
        <button 
          className={`triplet-btn ${tripletType === 'S' ? 'active' : ''}`}
          data-type="S"
          onClick={() => handleTripletTypeClick('S')}
        >
          S
        </button>
        <button 
          className={`triplet-btn ${tripletType === 'O' ? 'active' : ''}`}
          data-type="O"
          onClick={() => handleTripletTypeClick('O')}
        >
          O
        </button>
        <button 
          className={`triplet-btn ${tripletType === 'R' ? 'active' : ''}`}
          data-type="R"
          onClick={() => handleTripletTypeClick('R')}
        >
          R
        </button>
      </div>
      <textarea
        placeholder="Ваш комментарий (необязательно)..."
        value={commentText}
        onChange={handleChange}
        autoFocus
      />
      <div className="comment-popup-actions">
        <button onClick={handleSave}>Сохранить</button>
        <button onClick={onCancel}>Отмена</button>
      </div>
    </div>
  );
};


interface CommentTooltipProps {
  comment: Comment;
  position: { x: number; y: number };
}

const CommentTooltip: FC<CommentTooltipProps> = ({ comment, position }) => {
  return (
    <div className="comment-tooltip" style={{ top: position.y, left: position.x }}>
      {comment.tripletType && (
        <div className={`triplet-type-badge triplet-badge-${comment.tripletType.toLowerCase()}`}>
          {comment.tripletType}
        </div>
      )}
      {comment.text.trim() && (
        <div className="comment-text">
          {comment.text}
        </div>
      )}
    </div>
  );
};


interface CommentableTextProps {
  initialText: string;
}

const CommentableText: FC<CommentableTextProps> = ({ initialText }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [selection, setSelection] = useState<SelectionData | null>(null);
  const [hoveredComment, setHoveredComment] = useState<HoveredCommentData | null>(null);

  // HTML как строка
  const [htmlString, setHtmlString] = useState<string>("");
  const handleFileRead = (content: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const bodyContent = doc.body.innerHTML;
    setHtmlString(bodyContent);
    console.log("HTML как строка:", bodyContent);
  };
  
  const textContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = (): void => {
    const currentSelection = window.getSelection();
    if (!currentSelection || currentSelection.isCollapsed) {
      setSelection(null);
      return;
    }

    const range = currentSelection.getRangeAt(0);

    if (!textContainerRef.current || !textContainerRef.current.contains(range.commonAncestorContainer)) {
      return;
    }
    
    const selectionText = range.toString();
    if (selectionText.trim().length === 0) {
      return;
    }
    
    const preSelectionRange = document.createRange();
    preSelectionRange.setStart(textContainerRef.current, 0);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    
    const startIndex = preSelectionRange.toString().length;
    const endIndex = startIndex + selectionText.length;

    const isOverlapping = comments.some(c => 
        (startIndex < c.endIndex && endIndex > c.startIndex)
    );

    if (isOverlapping) {
        alert("Нельзя создавать комментарии, пересекающиеся с другими. Попробуйте выделить другой фрагмент.");
        window.getSelection()?.removeAllRanges();
        return;
    }

    setSelection({
      startIndex,
      endIndex,
      rect: range.getBoundingClientRect(),
    });
  };

  const handleSaveComment = (commentText: string, tripletType: TripletType): void => {
    if (!selection) return;

    const newComment: Comment = {
      id: Date.now(),
      text: commentText || '', // Если текст пустой, используем пустую строку
      startIndex: selection.startIndex,
      endIndex: selection.endIndex,
      tripletType,
    };
    
    setComments(prevComments => 
      [...prevComments, newComment].sort((a, b) => a.startIndex - b.startIndex)
    );
    
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleHighlightMouseEnter = (event: MouseEvent<HTMLSpanElement>, comment: Comment): void => {
    // Показываем тултип только если есть текст комментария или тип триплета
    if (comment.text.trim() || comment.tripletType) {
      setHoveredComment({
        comment,
        rect: event.currentTarget.getBoundingClientRect(),
      });
    }
  };

  const handleHighlightMouseLeave = (): void => {
    setHoveredComment(null);
  };

  const renderedText = useMemo(() => {
    if (comments.length === 0) {
      return [initialText];
    }
    
    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    comments.forEach((comment) => {
      if (comment.startIndex > lastIndex) {
        segments.push(
          <span key={`text-${lastIndex}`}>{initialText.substring(lastIndex, comment.startIndex)}</span>
        );
      }
             segments.push(
         <span
           key={comment.id}
           className={`highlighted-text ${comment.tripletType ? `triplet-${comment.tripletType.toLowerCase()}` : ''}`}
           onMouseEnter={(e) => handleHighlightMouseEnter(e, comment)}
           onMouseLeave={handleHighlightMouseLeave}
         >
           {initialText.substring(comment.startIndex, comment.endIndex)}
         </span>
       );
      lastIndex = comment.endIndex;
    });

    if (lastIndex < initialText.length) {
      segments.push(
        <span key={`text-${lastIndex}`}>{initialText.substring(lastIndex)}</span>
      );
    }

    return segments;
  }, [initialText, comments]);

  return (
    <div className="commentable-container">
      <div
        ref={textContainerRef}
        className="text-content"
        onMouseUp={handleMouseUp}
      >
        {renderedText}
      </div>
      
      {selection && (
        <CommentInputPopup
          position={{ x: selection.rect.left, y: selection.rect.bottom + window.scrollY + 5 }}
          onSave={handleSaveComment}
          onCancel={() => setSelection(null)}
        />
      )}
      
      {hoveredComment && (
          <CommentTooltip 
            comment={hoveredComment.comment}
            position={{ x: hoveredComment.rect.left, y: hoveredComment.rect.bottom + window.scrollY + 5 }}
          />
      )}

      {/* TODO: добавить возможность загружать HTML файл */}
      <FileHTMLToString onFileRead={handleFileRead} />
      <div style={{ overflowY: "auto", maxHeight: "100vh", width: "80%", margin: "0 auto", border: "1px solid black" }}>
        {parse(htmlString)}
      </div>
    </div>
  );
};

export { CommentableText };