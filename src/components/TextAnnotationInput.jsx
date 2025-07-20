import { useState, useRef, useEffect, useCallback, memo } from 'react';
import './ImageAnnotation.css';

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 24;

const TextAnnotationInput = ({ initialPosition = { x: 0, y: 0 }, editText = '', editId = null, annotations, ctxRef, canvasRef, onFinish, onCancel }) => {

  const [text, setText] = useState(editText);
  const [dimensions, setDimensions] = useState({
    x: initialPosition.x,
    y: initialPosition.y,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  });
  const textAreaRef = useRef(null);

  // 初始化文本和尺寸
  const initTextDimensions = useCallback(() => {
    if (!ctxRef.current || !canvasRef.current) return;
    ctxRef.current.font = '16px Arial';
    let width = DEFAULT_WIDTH;
    let height = DEFAULT_HEIGHT;
    if (editId) {
      const annotation = annotations.find((a) => a.id === editId);
      if (annotation?.text) {
        const lines = annotation.text.split('\n');
        height = Math.max(DEFAULT_HEIGHT, lines.length * 20);
        width = Math.max(DEFAULT_WIDTH, ...lines.map((line) => ctxRef.current.measureText(line).width)) + 10;
      }
    }

    // 确保位置在合理范围内
    const x = Math.max(0, Math.min(initialPosition.x, canvasRef.current.width - width));
    const y = Math.max(16, Math.min(initialPosition.y, canvasRef.current.height - height));
    setDimensions({
      x,
      y,
      width,
      height,
    });
  }, [editId, initialPosition, annotations, ctxRef, canvasRef]);

  const handleChange = useCallback(
    (e) => {
      if (!ctxRef.current || !canvasRef.current) return;

      const input = e.target.value;
      setText(input);

      // 计算文本尺寸
      const lines = input.split('\n');
      let totalHeight = 0;
      let maxLineWidth = 0;

      lines.forEach((line) => {
        const metrics = ctxRef.current.measureText(line);
        maxLineWidth = Math.max(maxLineWidth, metrics.width);
        totalHeight += 20;
      });

      setDimensions((prev) => ({
        ...prev,
        width: maxLineWidth + 10,
        height: Math.min(totalHeight, canvasRef.current.height - prev.y - 10),
      }));
    },
    [ctxRef, canvasRef]
  );

  const handleSave = useCallback(() => {
    if (text.trim()) {
      onFinish({ text, editId, ...dimensions });
    } else {
      onCancel?.();
    }
  }, [text, editId, dimensions, onFinish, onCancel]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && e.shiftKey) return;
      if (e.key === 'Escape') {
        onCancel?.();
      } else if (e.key === 'Enter') {
        handleSave();
      }
    },
    [handleSave, onCancel]
  );

  useEffect(() => {    
    if (textAreaRef.current) {
      textAreaRef.current.focus();
      const len = textAreaRef.current.value.length;
      textAreaRef.current.setSelectionRange(len, len);
      initTextDimensions();
      console.log('TextAnnotationInpu:', dimensions);
    }
  }, []);

  return (
    <textarea
      ref={textAreaRef}
      className="text-input"
      style={{
        left: dimensions.x,
        top: dimensions.y,
        width: dimensions.width,
        height: dimensions.height,
      }}
      value={text}
      onChange={handleChange}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
    />
  );
};

export default memo(TextAnnotationInput);
