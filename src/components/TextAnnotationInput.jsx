import { useState, useRef, useEffect, useCallback, memo, useImperativeHandle, forwardRef } from 'react';
import { TEXT_FONT, TEXT_LINE_HEIGHT } from '../utils/canvasUtils';
import './ImageAnnotation.css';

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 24;

const TextAnnotationInput = forwardRef((props, ref) => {
  const { annotations, ctxRef, canvasRef } = props;
  const [text, setText] = useState({
    visible: false,
    position: { x: 0, y: 0 }, // 初始位置
    value: '',
    id: null, // 正在编辑的标注ID
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  });
  const textAreaRef = useRef(null);
  const focusTimer = useRef(null);

  // 初始化文本和尺寸
  const initTextDimensions = useCallback(() => {
    if (!ctxRef.current || !canvasRef.current) return;
    ctxRef.current.font = TEXT_FONT;
    let width = DEFAULT_WIDTH;
    let height = DEFAULT_HEIGHT;
    if (text.id) {
      const annotation = annotations.find((a) => a.id === text.id);
      if (annotation?.text) {
        const lines = annotation.text.split('\n');
        height = Math.max(DEFAULT_HEIGHT, lines.length * TEXT_LINE_HEIGHT);
        width = Math.max(DEFAULT_WIDTH, ...lines.map((line) => ctxRef.current.measureText(line).width)) + 10;
      }
    }

    // 确保位置在合理范围内
    const x = Math.max(0, Math.min(text.position.x, canvasRef.current.width - width));
    const y = Math.max(16, Math.min(text.position.y, canvasRef.current.height - height));
    setText({ ...text, position: { x, y }, width, height });
  }, [text, annotations, ctxRef, canvasRef]);

  const handleChange = useCallback(
    (e) => {
      if (!ctxRef.current || !canvasRef.current) return;
      const input = e.target.value;
      // 计算文本尺寸
      const lines = input.split('\n');
      let totalHeight = 0;
      let maxLineWidth = 0;

      lines.forEach((line) => {
        const metrics = ctxRef.current.measureText(line);
        maxLineWidth = Math.max(maxLineWidth, metrics.width);
        totalHeight += TEXT_LINE_HEIGHT;
      });

      setText((prev) => ({
        ...prev,
        value: input,
        width: maxLineWidth + 10,
        height: Math.min(totalHeight, canvasRef.current.height - prev.position.y - 10),
      }));
    },
    [ctxRef, canvasRef]
  );

  const handleKeyDown = useCallback((e) => {
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

  useImperativeHandle(ref, () => ({
    getText: () => text,
    setText,
  }));

  useEffect(() => {
    if (!text.visible) return;
    initTextDimensions();
  }, [text.visible, text.id]);

  useEffect(() => {
    if (textAreaRef.current && text.visible) {
      focusTimer.current && clearTimeout(focusTimer.current);
      focusTimer.current = setTimeout(() => {
        textAreaRef.current.focus();
        // const len = textAreaRef.current.value.length;
        // textAreaRef.current.setSelectionRange(len, len);
      }, 200);
    }
    return () => {
      focusTimer.current && clearTimeout(focusTimer.current);
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
          }}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      ) : null}
    </>
  );
});

export default memo(TextAnnotationInput);
