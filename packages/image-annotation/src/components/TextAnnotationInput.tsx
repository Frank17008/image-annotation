import { useState, useRef, useEffect, useCallback, memo, useMemo, useImperativeHandle, forwardRef } from 'react';
import type { Annotation, TextInputState } from '../types/annotations';
import { TEXT_FONT, TEXT_LINE_HEIGHT } from '../utils/canvasUtils';
import './ImageAnnotation.css';

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 24;

interface TextAnnotationInputProps {
  annotations: Annotation[];
  ctxRef: React.MutableRefObject<CanvasRenderingContext2D | null>;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  defaultColor?: string;
}

export interface TextAnnotationInputHandle {
  getText: () => TextInputState;
  setText: React.Dispatch<React.SetStateAction<TextInputState>>;
}

const TextAnnotationInput = forwardRef<TextAnnotationInputHandle, TextAnnotationInputProps>((props, ref) => {
  const { annotations, ctxRef, canvasRef, defaultColor } = props;
  const [text, setText] = useState<TextInputState>({
    visible: false,
    position: { x: 0, y: 0 },
    value: '',
    id: null,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  });

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const focusTimer = useRef<number | null>(null);

  const fontColor = useMemo(() => defaultColor, [defaultColor]);

  const initTextDimensions = useCallback(() => {
    if (!ctxRef.current || !canvasRef.current) return;
    ctxRef.current.font = TEXT_FONT;
    let width = DEFAULT_WIDTH;
    let height = DEFAULT_HEIGHT;
    if (text.id) {
      const annotation = annotations.find((a) => a.id === text.id);
      if ((annotation as any)?.text) {
        const lines = (annotation as any).text.split('\n') as string[];
        height = Math.max(DEFAULT_HEIGHT, lines.length * TEXT_LINE_HEIGHT);
        width = Math.max(DEFAULT_WIDTH, ...lines.map((line) => (ctxRef.current ? ctxRef.current.measureText(line).width : 0))) + 10;
      }
    }

    const x = Math.max(0, Math.min(text.position.x, canvasRef.current.width - width));
    const y = Math.max(16, Math.min(text.position.y, canvasRef.current.height - height));
    setText({ ...text, position: { x, y }, width, height });
  }, [text, annotations, ctxRef, canvasRef]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!ctxRef.current || !canvasRef.current) return;
      const input = e.target.value;
      // const lines = input.split('\n');
      // let totalHeight = 0;
      // let maxLineWidth = 0;

      // lines.forEach((line) => {
      //   const metrics = ctxRef.current!.measureText(line);
      //   maxLineWidth = Math.max(maxLineWidth, metrics.width);
      //   totalHeight += TEXT_LINE_HEIGHT;
      // });

      setText((prev) => ({
        ...prev,
        value: input,
        // width: maxLineWidth + 10,
        // height: Math.min(totalHeight, canvasRef.current!.height - prev.position.y - 10),
      }));
    },
    [ctxRef, canvasRef]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setText((prev) => ({ ...prev, visible: false, value: '' }));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      setText((prev) => ({ ...prev, visible: false, value: prev.value.trim() ? prev.value : '' }));
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getText: () => text,
      setText,
    }),
    [text]
  );

  useEffect(() => {
    if (!text.visible) return;
    initTextDimensions();
  }, [text.visible, text.id]);

  useEffect(() => {
    if (textAreaRef.current && text.visible) {
      focusTimer.current && window.clearTimeout(focusTimer.current);
      focusTimer.current = window.setTimeout(() => {
        textAreaRef.current && textAreaRef.current.focus();
      }, 200);
    }
    return () => {
      focusTimer.current && window.clearTimeout(focusTimer.current);
    };
  }, [text.position, text.visible]);

  return (
    <>
      {text.visible ? (
        <textarea
          id="textInput"
          ref={textAreaRef}
          className="text-input"
          value={text.value}
          style={{
            left: text.position.x,
            top: text.position.y,
            width: text.width,
            height: text.height,
            color: fontColor,
          }}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      ) : null}
    </>
  );
});

export default memo(TextAnnotationInput);
