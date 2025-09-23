import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ToolBar from './ToolBar';
import TextAnnotationInput, { TextAnnotationInputHandle } from './TextAnnotationInput';
import { drawCircle, drawFreehand, drawRectangle, drawText, drawArrow } from '../tools/drawTool';
import { drawControlPoint, getBoundingBox } from '../tools/common';
import { isInAnnotation, throttle, getCanvasPoint, cloneAnnotation, download } from '../utils/canvasUtils';
import type { Annotation, ToolType } from '../types/annotations';
import './ImageAnnotation.css';

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

interface ImageAnnotationProps {
  src: string;
}

interface DrawState {
  isDrawing: boolean;
  isDragging: boolean;
  startPos: { x: number; y: number };
  currentPos: { x: number; y: number };
  freehandPath: Array<{ x: number; y: number }>;
  selectedId: string | null;
}

const ImageAnnotation: React.FC<ImageAnnotationProps> = ({ src }) => {
  const idRef = useRef(0);
  const nextId = useCallback(() => `${Date.now()}-${idRef.current++}`, []);

  const [drawState, setDrawState] = useState<DrawState>({
    isDrawing: false,
    isDragging: false,
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },
    freehandPath: [],
    selectedId: null,
  });
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [currentTool, setCurrentTool] = useState<ToolType>(null);
  const [strokeColor, setStrokeColor] = useState<string>('#FF0000');
  const [lineWidth, setLineWidth] = useState<number>(2);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const textAreaRef = useRef<TextAnnotationInputHandle | null>(null);
  const reqAniRef = useRef<number | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const onExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    download(canvas);
  };

  const saveHistory = useCallback(() => {
    setHistory((prev) => [...prev, annotations.map(cloneAnnotation)]);
  }, [annotations]);

  const undo = () => {
    if (history.length > 0) {
      const lastState = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setAnnotations(lastState);
      setDrawState((prev) => ({ ...prev, selectedId: null }));
    }
  };

  const deleteSelected = useCallback(() => {
    if (drawState.selectedId) {
      saveHistory();
      setAnnotations((prev) => prev.filter((a) => a.id !== drawState.selectedId));
      setDrawState((prev) => ({ ...prev, selectedId: null }));
    }
  }, [drawState.selectedId, saveHistory]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = DEFAULT_WIDTH;
    canvas.height = DEFAULT_HEIGHT;
    ctxRef.current = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = src;
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container && imageRef.current) {
        const ratio = imageRef.current.width / imageRef.current.height;
        const maxWidth = container.clientWidth;
        canvas.style.width = `${Math.min(maxWidth, imageRef.current.width)}px`;
        canvas.style.height = `${Math.min(maxWidth / ratio, imageRef.current.height)}px`;
      }
    };
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [src]);

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || !imageRef.current) return;
    const ratio = Math.min(DEFAULT_WIDTH / imageRef.current.naturalWidth, DEFAULT_HEIGHT / imageRef.current.naturalHeight);
    const displayWidth = imageRef.current.naturalWidth * ratio;
    const displayHeight = imageRef.current.naturalHeight * ratio;
    const offsetX = (DEFAULT_WIDTH - displayWidth) / 2;
    const offsetY = (DEFAULT_HEIGHT - displayHeight) / 2;
    ctx.drawImage(imageRef.current, offsetX, offsetY, displayWidth, displayHeight);
    canvas.dataset.scale = `${ratio}`;
    canvas.dataset.offsetX = `${offsetX}`;
    canvas.dataset.offsetY = `${offsetY}`;
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const { startPos, currentPos, isDrawing, selectedId, freehandPath } = drawState;
    if (reqAniRef.current) cancelAnimationFrame(reqAniRef.current);
    reqAniRef.current = requestAnimationFrame(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const strokeStyle = strokeColor;
      const currentLineWidth = lineWidth;
      drawImage();
      annotations.forEach((ann) => {
        switch (ann.type) {
          case 'rectangle':
            drawRectangle(ctx, ann, ann.lineWidth || currentLineWidth);
            break;
          case 'circle':
            drawCircle(ctx, ann, ann.lineWidth || currentLineWidth);
            break;
          case 'arrow':
            drawArrow(ctx, { ...ann, fromX: ann.x, fromY: ann.y, toX: ann.x + ann.width, toY: ann.y + ann.height }, ann.lineWidth || currentLineWidth);
            break;
          case 'text': {
            const text = textAreaRef.current?.getText();
            if (text?.visible && text.id === ann.id) return;
            drawText(ctx, ann);
            break;
          }
          case 'freehand':
            drawFreehand(ctx, ann, ann.lineWidth || currentLineWidth);
            break;
          default:
            break;
        }

        if (ann.id === selectedId && ann.type !== 'freehand' && ann.type !== 'text') {
          const boundingBox = getBoundingBox(ann, ctx);
          if (ann.type === 'arrow') {
            drawControlPoint(ctx, ann.x, ann.y);
            drawControlPoint(ctx, ann.x + ann.width, ann.y + ann.height);
          } else {
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = '#1890ff';
            ctx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
            ctx.setLineDash([]);
            drawControlPoint(ctx, boundingBox.x, boundingBox.y);
            drawControlPoint(ctx, boundingBox.x + boundingBox.width, boundingBox.y);
            drawControlPoint(ctx, boundingBox.x + boundingBox.width, boundingBox.y + boundingBox.height);
            drawControlPoint(ctx, boundingBox.x, boundingBox.y + boundingBox.height);
          }
        }
      });

      if (isDrawing && currentTool) {
        const width = currentPos.x - startPos.x;
        const height = currentPos.y - startPos.y;
        switch (currentTool) {
          case 'rectangle':
            drawRectangle(ctx, { type: 'rectangle', x: startPos.x, y: startPos.y, width, height, color: strokeStyle }, currentLineWidth);
            break;
          case 'circle': {
            const radius = Math.sqrt(width ** 2 + height ** 2);
            drawCircle(ctx, { type: 'circle', x: startPos.x, y: startPos.y, radius, color: strokeStyle }, currentLineWidth);
            break;
          }
          case 'arrow':
            drawArrow(ctx, { fromX: startPos.x, fromY: startPos.y, toX: currentPos.x, toY: currentPos.y, color: strokeStyle }, currentLineWidth);
            break;
          case 'freehand':
            drawFreehand(ctx, { type: 'freehand', points: freehandPath, color: strokeStyle }, currentLineWidth);
            break;
          default:
            break;
        }
      }
    });
  }, [annotations, drawState, currentTool, strokeColor, lineWidth, drawImage]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.detail === 2 || e.button === 2 || !currentTool) return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const { x, y } = getCanvasPoint(e, canvas);
    const isOnTextAnnotation = annotations.filter((ann) => ann.type === 'text').some((ann) => isInAnnotation(ann, x, y, ctx));
    if (!isOnTextAnnotation) {
      const text = textAreaRef.current?.getText();
      if (currentTool === 'text') {
        if (text?.visible) {
          if (text.value && text.value.trim()) {
            const id = text.id || nextId();
            setAnnotations((prev) => [...prev, { id, type: 'text', x: text.position.x, y: text.position.y + 16, text: text.value, color: strokeColor }]);
            textAreaRef.current?.setText({ ...text, id, visible: false });
            saveHistory();
          } else {
            textAreaRef.current?.setText((prev) => ({ ...prev, position: { x, y } }));
          }
        } else {
          textAreaRef.current?.setText((prev) => ({ ...prev, visible: true, position: { x, y }, value: '', id: null }));
        }
        return;
      } else {
        text?.visible && textAreaRef.current?.setText({ ...text, visible: false });
      }
    }

    const clickedAnnotation = [...annotations].reverse().find((ann) => isInAnnotation(ann, x, y, ctx));
    setDrawState({
      ...drawState,
      startPos: { x, y },
      currentPos: { x, y },
      freehandPath: currentTool === 'freehand' ? [{ x, y }] : [],
      selectedId: clickedAnnotation?.id || null,
      isDragging: !!clickedAnnotation,
      isDrawing: !clickedAnnotation,
    });
  };

  const handleContextMenu = () => {
    if (drawState.selectedId) {
      setDrawState({ ...drawState, selectedId: null });
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;
      const { startPos, currentPos, isDragging, isDrawing, selectedId, freehandPath } = drawState;
      const { x, y } = getCanvasPoint(e, canvas);
      const isOnAnnotation = annotations.some((ann) => isInAnnotation(ann, x, y, ctx));
      canvas.style.cursor = isOnAnnotation ? 'move' : 'crosshair';
      if (isDragging && selectedId) {
        const dx = x - currentPos.x;
        const dy = y - currentPos.y;
        setAnnotations((prev) =>
          prev.map((ann) => {
            if (ann.id === selectedId) {
              if (ann.type === 'freehand') {
                return {
                  ...ann,
                  points: ann.points.map((point: any) => ({ x: point.x + dx, y: point.y + dy })),
                };
              } else {
                return { ...ann, x: ann.x + dx, y: ann.y + dy };
              }
            }
            return ann;
          })
        );
        setDrawState({ ...drawState, currentPos: { x, y } });
        drawCanvas();
        return;
      }
      if (isDrawing) {
        setDrawState({ ...drawState, freehandPath: currentTool === 'freehand' ? [...freehandPath, { x, y }] : freehandPath, currentPos: { x, y } });
        drawCanvas();
      }
    },
    [drawState, currentTool, annotations, drawCanvas]
  );

  const throttledMouseMove = useMemo(() => throttle(handleMouseMove, 50), [handleMouseMove]);

  const handleMouseUp = () => {
    const { startPos, currentPos, isDrawing, isDragging, freehandPath } = drawState;
    if ((isDrawing && isDragging) || !currentTool) return;
    if (isDragging) {
      saveHistory();
      setDrawState({ ...drawState, isDragging: false, isDrawing: false });
      return;
    }
    const width = currentPos.x - startPos.x;
    const height = currentPos.y - startPos.y;
    if (['rectangle', 'circle', 'arrow', 'freehand'].includes(currentTool) && (Math.abs(width) > 3 || Math.abs(height) > 3)) {
      saveHistory();
      const points = currentTool === 'freehand' ? { points: [...freehandPath] } : {};
      const radius = currentTool === 'circle' ? { radius: Math.sqrt(width ** 2 + height ** 2) } : {};
      const newAnnotation: any = {
        id: nextId(),
        type: currentTool,
        x: startPos.x,
        y: startPos.y,
        width,
        height,
        color: strokeColor,
        lineWidth: lineWidth,
        ...points,
        ...radius,
      };
      freehandPath.length > 0 && setDrawState({ ...drawState, freehandPath: [] });
      setAnnotations((prev) => [...prev, newAnnotation]);
    }
    setDrawState({ selectedId: drawState.selectedId, freehandPath: [], startPos: { x: 0, y: 0 }, currentPos: { x: 0, y: 0 }, isDrawing: false, isDragging: false });
  };

  const clearCanvas = () => {
    saveHistory();
    setAnnotations([]);
    setDrawState({ ...drawState, selectedId: null });
  };

  useEffect(() => {
    const { selectedId, isDragging, isDrawing } = drawState;
    if (!isDragging || !isDrawing) {
      drawCanvas();
    }
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = selectedId ? 'move' : 'crosshair';
    }
  }, [annotations, drawState.isDragging, drawState.isDrawing, drawState.selectedId, drawCanvas]);

  useEffect(() => {
    if (drawState.selectedId && currentTool !== 'freehand') {
      setDrawState({ ...drawState, selectedId: null });
    }
  }, [currentTool]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const text = textAreaRef.current?.getText();
      if (currentTool === 'text' && text?.visible) {
        return;
      }
      if (e.key === 'Delete') {
        deleteSelected();
      } else if (e.ctrlKey && e.key === 'z') {
        undo();
      } else if (e.key === 'Escape') {
        if (currentTool === 'text' && text?.visible) {
          textAreaRef.current?.setText({ ...text, visible: false });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (reqAniRef.current) cancelAnimationFrame(reqAniRef.current);
    };
  }, [deleteSelected, undo, currentTool]);

  return (
    <div className="image-annotation">
      <ToolBar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        onClear={clearCanvas}
        onUndo={undo}
        onExport={onExport}
        historyLength={history.length}
        strokeColor={strokeColor}
        lineWidth={lineWidth}
        onColorChange={setStrokeColor}
        onLineWidthChange={setLineWidth}
      />

      <div style={{ display: 'flex' }}>
        <div className="image-container">
          <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={throttledMouseMove} onMouseUp={handleMouseUp} onContextMenu={handleContextMenu} />
          <TextAnnotationInput ref={textAreaRef} annotations={annotations} defaultColor={strokeColor} ctxRef={ctxRef} canvasRef={canvasRef} />
        </div>
        <div className="annotation-info">
          <h3>当前标注 ({annotations.length}个):</h3>
          <pre>{JSON.stringify(annotations, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
};

export default ImageAnnotation;
