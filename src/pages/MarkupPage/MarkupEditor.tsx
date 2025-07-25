import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import type { FC, ReactNode } from 'react';
import styles from './MarkupEditor.module.css';
import { FileHTMLToString } from '../../features/FileHTMLToString/FileHTMLToString';
import { getMarkup, postMarkup } from '../../shared/api/markupApi';
import { getAllObjects, getAllPredicates } from '../../shared/api/generalApi';
import { getGraph } from '../../shared/api/graphApi';
import type { CommentInterface } from '../../shared/types/markupTypes';

const MOCK_SUBJECTS = ['Субъект 1', 'Субъект 2', 'Субъект 3', 'Другой Субъект'];
const MOCK_PREDICATES = ['является частью', 'имеет свойство', 'относится к', 'создан из'];

const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

interface SelectionData {
  startIndex: number;
  endIndex: number;
  rect: DOMRect;
}

interface HoveredCommentData {
  comment: CommentInterface;
  rect: DOMRect;
}

interface CommentInputPopupProps {
  position: { x: number; y: number };
  onSave: (subject: string, predicate: string) => void;
  onCancel: () => void;
  subjects: string[];
  predicates: string[];
}

const CommentInputPopup: FC<CommentInputPopupProps> = ({ position, onSave, onCancel, subjects, predicates }) => {
  const [subject, setSubject] = useState<string>(subjects[0] || '');
  const [predicate, setPredicate] = useState<string>(predicates[0] || '');

  useEffect(() => {
    setSubject(subjects[0] || '');
  }, [subjects]);
  useEffect(() => {
    setPredicate(predicates[0] || '');
  }, [predicates]);

  const handleSave = () => {
    if (subject && predicate) {
      onSave(subject, predicate);
    }
  };

  return (
    <div className={styles.commentPopup} style={{ top: position.y, left: position.x }}>
      <div className={styles.commentPopupSelects}>
        <label>
          <span>Субъект:</span>
          <select className={styles.commentPopupSelectsSelect} id='subject' value={subject} onChange={(e) => setSubject(e.target.value)}>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>
          <span>Предикат:</span>
          <select className={styles.commentPopupSelectsSelect} id='predicate' value={predicate} onChange={(e) => setPredicate(e.target.value)}>
            {predicates.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <div className={styles.commentPopupActions}>
        <button onClick={handleSave}>Сохранить</button>
        <button onClick={onCancel}>Отмена</button>
      </div>
    </div>
  );
};


interface CommentTooltipProps {
  comment: CommentInterface;
  position: { x: number; y: number };
}

const CommentTooltip: FC<CommentTooltipProps> = ({ comment, position }) => {
  return (
    <div className={styles.commentTooltip} style={{ top: position.y, left: position.x }}>
      <div><strong>Субъект:</strong> {comment.subject}</div>
      <div><strong>Предикат:</strong> {comment.predicate}</div>
      <div><strong>Объект:</strong> {comment.object}</div>
    </div>
  );
};

interface MarkupEditorProps {}

const MarkupEditor: FC<MarkupEditorProps> = () => {
  const [comments, setComments] = useState<CommentInterface[]>([]);
  const [selection, setSelection] = useState<SelectionData | null>(null);
  const [hoveredComment, setHoveredComment] = useState<HoveredCommentData | null>(null);
  const [rawHtml, setRawHtml] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [subjects, setSubjects] = useState<string[]>(MOCK_SUBJECTS);
  const [predicates, setPredicates] = useState<string[]>(MOCK_PREDICATES);
  const textContainerRef = useRef<HTMLDivElement>(null);

  const handleFileRead = async (content: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    setRawHtml(doc.body.innerHTML);
    setComments([]);
    setSelection(null);
    setHoveredComment(null);

    // Загружаем subjects и predicates через getGraph
    try {
      const { data } = await getGraph();
      const loadedSubjects = Array.isArray(data.nodes) ? data.nodes.map((n: any) => n.label) : [];
      const loadedPredicates = Array.isArray(data.links) ? data.links.map((l: any) => l.predicate) : [];
      setSubjects(loadedSubjects.length > 0 ? loadedSubjects : MOCK_SUBJECTS);
      setPredicates(
        loadedPredicates.length > 0
          ? Array.from(new Set(loadedPredicates))
          : MOCK_PREDICATES
      );
    } catch (e) {
      setSubjects(MOCK_SUBJECTS);
      setPredicates(MOCK_PREDICATES);
    }

    try {
      const { data: loadedComments } = await getMarkup('testHash');
      const sortedComments = loadedComments.sort((a, b) => a.startIndex - b.startIndex);
      setComments(sortedComments);
      console.log('Загруженные комментарии:', sortedComments);
    } catch (error) {
      console.error('Не удалось загрузить разметку:', error);
    }
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

    // TODO: get filename from file
    const newComment: CommentInterface = {
      id: Date.now(),
      startIndex: selection.startIndex,
      endIndex: selection.endIndex,
      subject,
      predicate,
      object: objectText,
      filename: 'testHash',
      createdAt: new Date().toISOString(),
      author: 'test',
    };

    setComments((prevComments) => {
      const updated = [...prevComments, newComment].sort((a, b) => a.startIndex - b.startIndex);
      console.log('Комментарии:', updated);
      return updated;
    });

    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleSaveMarkup = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // fileHash можно получить из пропсов или состояния, здесь пример с 'testHash'
      await postMarkup('testHash', comments);
      setSaveSuccess(true);
    } catch (e) {
      setSaveSuccess(false);
      alert('Ошибка при сохранении разметки');
      console.error('Ошибка при сохранении разметки:', e);
    } finally {
      setIsSaving(false);
    }
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
                className={styles.highlightedText}
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
      const highlightSpan = target.closest(`.${styles.highlightedText}`) as HTMLElement;

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
       if (target.closest(`.${styles.highlightedText}`)){
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
    <div className={styles.commentableContainer}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, marginTop: 16 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <FileHTMLToString onFileRead={handleFileRead} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <button
            onClick={handleSaveMarkup}
            disabled={isSaving}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#27ae60',
              color: 'white',
              border: 'none',
              fontSize: 24,
              fontWeight: 'bold',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              marginRight: 0,
              position: 'relative',
              transition: 'background 0.2s',
            }}
          >
            {isSaving ? (
              <span className={styles.loader} />
            ) : (
              '💾'
            )}
          </button>
          {saveSuccess && (
            <span style={{ color: '#27ae60', fontWeight: 'bold', fontSize: 18, marginTop: 8 }}>✔ Разметка успешно сохранена</span>
          )}
        </div>
      </div>
      <div
        ref={textContainerRef}
        className={styles.textContent}
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
          subjects={subjects}
          predicates={predicates}
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