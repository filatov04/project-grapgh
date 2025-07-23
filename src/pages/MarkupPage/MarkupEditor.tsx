import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import type { FC, ChangeEvent, MouseEvent, ReactNode } from 'react';
import './CommentableText.css';
import { FileHTMLToString } from '../../features/FileHTMLToString/FileHTMLToString';

const MOCK_SUBJECTS = ['Субъект 1', 'Субъект 2', 'Субъект 3', 'Другой Субъект'];
const MOCK_PREDICATES = ['является частью', 'имеет свойство', 'относится к', 'создан из'];

const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

// TODO: добавить типы для комментариев
interface Comment {
  id: number;
  startIndex: number;
  endIndex: number;
  subject: string;
  predicate: string;
  object: string; // The highlighted text
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
  onSave: (subject: string, predicate: string) => void;
  onCancel: () => void;
}

const CommentInputPopup: FC<CommentInputPopupProps> = ({ position, onSave, onCancel }) => {
  const [subject, setSubject] = useState<string>(MOCK_SUBJECTS[0]);
  const [predicate, setPredicate] = useState<string>(MOCK_PREDICATES[0]);

  const handleSave = () => {
    if (subject && predicate) {
      onSave(subject, predicate);
    }
  };

  return (
    <div className="comment-popup" style={{ top: position.y, left: position.x }}>
      <div className="comment-popup-selects">
        <label>
          <span>Субъект:</span>
          <select className='comment-popup-selects-select' id='subject' value={subject} onChange={(e) => setSubject(e.target.value)}>
            {MOCK_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>
          <span>Предикат:</span>
          <select className='comment-popup-selects-select' id='predicate' value={predicate} onChange={(e) => setPredicate(e.target.value)}>
            {MOCK_PREDICATES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>
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
      <div><strong>Субъект:</strong> {comment.subject}</div>
      <div><strong>Предикат:</strong> {comment.predicate}</div>
      <div><strong>Объект:</strong> {comment.object}</div>
    </div>
  );
};

interface MarkupEditorProps {}

const MarkupEditor: FC<MarkupEditorProps> = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [selection, setSelection] = useState<SelectionData | null>(null);
  const [hoveredComment, setHoveredComment] = useState<HoveredCommentData | null>(null);
  const [rawHtml, setRawHtml] = useState<string>('');
  const textContainerRef = useRef<HTMLDivElement>(null);

  const handleFileRead = (content: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    setRawHtml(doc.body.innerHTML);
    setComments([]);
    setSelection(null);
    setHoveredComment(null);
  };

  const handleMouseUp = (): void => {
    const currentSelection = window.getSelection();
    if (
      !currentSelection ||
      currentSelection.isCollapsed ||
      !textContainerRef.current
    ) {
      setSelection(null);
      return;
    }

    const range = currentSelection.getRangeAt(0);

    if (!textContainerRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    const getTextOffset = (node: Node, offset: number): number => {
      let textOffset = 0;
      const walker = document.createTreeWalker(
        textContainerRef.current!,
        NodeFilter.SHOW_TEXT,
        null
      );
      let currentNode = walker.nextNode();
      while (currentNode) {
        if (currentNode === node) {
          textOffset += offset;
          break;
        }
        textOffset += currentNode.textContent?.length || 0;
        if (currentNode === node) {
          break;
        }
        currentNode = walker.nextNode();
      }
      return textOffset;
    };

    const startIndex = getTextOffset(range.startContainer, range.startOffset);
    const endIndex = getTextOffset(range.endContainer, range.endOffset);

    if (startIndex >= endIndex) {
      setSelection(null);
      return;
    }

    const isOverlapping = comments.some(
      (c) => startIndex < c.endIndex && endIndex > c.startIndex
    );

    if (isOverlapping) {
      alert(
        'Нельзя создавать комментарии, пересекающиеся с другими. Попробуйте выделить другой фрагмент.'
      );
      window.getSelection()?.removeAllRanges();
      return;
    }

    setSelection({
      startIndex,
      endIndex,
      rect: range.getBoundingClientRect(),
    });
  };

  const handleSaveComment = (
    subject: string,
    predicate: string
  ): void => {
    if (!selection) return;

    const objectText = textContainerRef.current?.textContent?.substring(selection.startIndex, selection.endIndex) || '';

    const newComment: Comment = {
      id: Date.now(),
      startIndex: selection.startIndex,
      endIndex: selection.endIndex,
      subject,
      predicate,
      object: objectText,
    };

    setComments((prevComments) =>
      [...prevComments, newComment].sort((a, b) => a.startIndex - b.startIndex)
    );

    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const renderedHtml = useMemo(() => {
    if (!rawHtml) {
      return null;
    }

    const root = new DOMParser().parseFromString(rawHtml, 'text/html').body;
    let textOffset = 0;

    const highlightNodes = (node: Node): ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) {
        const nodeText = node.textContent || '';
        const segments: ReactNode[] = [];
        let lastIndex = 0;

        const relevantComments = comments
          .filter(
            (c) =>
              c.startIndex < textOffset + nodeText.length &&
              c.endIndex > textOffset
          )
          .sort((a, b) => a.startIndex - b.startIndex);

        relevantComments.forEach((comment) => {
          const start = Math.max(0, comment.startIndex - textOffset);
          const end = Math.min(nodeText.length, comment.endIndex - textOffset);

          if (start > lastIndex) {
            segments.push(nodeText.substring(lastIndex, start));
          }
          if (end > start) {
            segments.push(
              <span
                key={comment.id}
                className="highlighted-text"
                data-comment-id={comment.id}
              >
                {nodeText.substring(start, end)}
              </span>
            );
          }
          lastIndex = Math.max(lastIndex, end);
        });

        if (lastIndex < nodeText.length) {
          segments.push(nodeText.substring(lastIndex));
        }
        textOffset += nodeText.length;
        return <>{segments}</>;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const nodeName = node.nodeName.toLowerCase();
        
        const props: { [key: string]: any } = {};
        for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            const propName = attr.name === 'class' ? 'className' : attr.name;
            if (propName === 'style') {
                const styleObj: {[key: string]: string} = {};
                attr.value.split(';').forEach(style => {
                    const [key, value] = style.split(':');
                    if (key && value) {
                      const camelCasedKey = key.trim().replace(/-./g, c => c.substring(1).toUpperCase());
                      styleObj[camelCasedKey] = value.trim();
                    }
                });
                props.style = styleObj;
            } else {
                 props[propName] = attr.value;
            }
        }

        if (VOID_ELEMENTS.has(nodeName)) {
            return React.createElement(nodeName, props);
        }

        const children = Array.from(node.childNodes).map((child, i) => (
          <React.Fragment key={i}>{highlightNodes(child)}</React.Fragment>
        ));

        return React.createElement(nodeName, props, children);
      }
      return null;
    };

    return Array.from(root.childNodes).map((node, i) => (
        <React.Fragment key={i}>{highlightNodes(node)}</React.Fragment>
    ));
  }, [rawHtml, comments]);


  useEffect(() => {
    const container = textContainerRef.current;
    if (!container) return;

    const handleMouseEnter = (event: globalThis.MouseEvent) => {
      const target = event.target as HTMLElement;
      const highlightSpan = target.closest('.highlighted-text') as HTMLElement;

      if (highlightSpan) {
        const commentId = Number(highlightSpan.dataset.commentId);
        const comment = comments.find((c) => c.id === commentId);
        if (comment) {
          setHoveredComment({
            comment,
            rect: highlightSpan.getBoundingClientRect(),
          });
        }
      }
    };

    const handleMouseLeave = (event: globalThis.MouseEvent) => {
       const target = event.target as HTMLElement;
       if (target.closest('.highlighted-text')){
           setHoveredComment(null);
       }
    };

    container.addEventListener('mouseover', handleMouseEnter);
    container.addEventListener('mouseout', handleMouseLeave);

    return () => {
      container.removeEventListener('mouseover', handleMouseEnter);
      container.removeEventListener('mouseout', handleMouseLeave);
    };
  }, [comments]);


  return (
    <div className="commentable-container">
      <FileHTMLToString onFileRead={handleFileRead} />
      <div
        ref={textContainerRef}
        className="text-content"
        onMouseUp={handleMouseUp}
      >
        {renderedHtml}
      </div>

      {selection && (
        <CommentInputPopup
          position={{
            x: selection.rect.left,
            y: selection.rect.bottom + window.scrollY + 5,
          }}
          onSave={handleSaveComment}
          onCancel={() => setSelection(null)}
        />
      )}

      {hoveredComment && (
        <CommentTooltip
          comment={hoveredComment.comment}
          position={{
            x: hoveredComment.rect.left,
            y: hoveredComment.rect.bottom + window.scrollY + 5,
          }}
        />
      )}
    </div>
  );
};

export { MarkupEditor };