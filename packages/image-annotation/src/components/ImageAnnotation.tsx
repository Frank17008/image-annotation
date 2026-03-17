import React, { useState, useRef, useEffect, useCallback } from 'react';
import ToolBar from './ToolBar';
import TextAnnotationInput, { type TextAnnotationInputHandle, type TextInputState } from './TextAnnotationInput';
import AnnotationCanvas, { type AnnotationCanvasHandle } from './AnnotationCanvas';
import { useDrawState, useHistory, useMouseEvents } from '../hooks';
import * as CanvasUtils from '../utils/canvasUtils';
import type { Annotation, ToolType } from '../types/annotations';
import './ImageAnnotation.css';

interface ImageAnnotationProps {
  src: string;
  className?: string;
  onChange?: (d: Annotation[]) => void;
  value?: Annotation[];
  onUpload?: () => void;
}

const ImageAnnotation: React.FC<ImageAnnotationProps> = ({ src, value, className = '', onChange, onUpload }) => {
  const [annotations, setAnnotations] = useState<Annotation[]>(value || []);
  const [currentTool, setCurrentTool] = useState<ToolType>(null);
  const [strokeColor, setStrokeColor] = useState<string>('#FF0000');
  const [lineWidth, setLineWidth] = useState<number>(4);
  const [viewport, setViewport] = useState<CanvasUtils.ViewportTransform>({ scale: 1, translateX: 0, translateY: 0 });
  const [isSpacePanning, setIsSpacePanning] = useState(false);

  const textAreaRef = useRef<TextAnnotationInputHandle | null>(null);
  const canvasRef = useRef<AnnotationCanvasHandle | null>(null);

  const { drawState, startDrawing, updateCurrentPos, finishDrawing, resetDrawState } = useDrawState();
  const { saveHistory, undo, redo, canUndo, canRedo } = useHistory(annotations);

  const zoomAt = useCallback(
    (screenX: number, screenY: number, nextScale: number) => {
      setViewport((prev) => {
        const scale = CanvasUtils.clampNumber(nextScale, 0.25, 4);
        const worldX = (screenX - prev.translateX) / prev.scale;
        const worldY = (screenY - prev.translateY) / prev.scale;
        return {
          scale,
          translateX: screenX - worldX * scale,
          translateY: screenY - worldY * scale,
        };
      });
    },
    [setViewport]
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const canvas = canvasRef.current?.getCanvas();
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      zoomAt(cx, cy, viewport.scale * factor);
    },
    [viewport.scale, zoomAt]
  );

  // 鼠标事件处理
  const mouseEvents = useMouseEvents({
    annotations,
    currentTool,
    drawState,
    strokeColor,
    lineWidth,
    viewport,
    onUpdateViewport: setViewport,
    isSpacePanning,
    onStartDrawing: startDrawing,
    onUpdateCurrentPos: updateCurrentPos,
    onFinishDrawing: finishDrawing,
    onUpdateAnnotations: setAnnotations,
    onSaveHistory: saveHistory,
    onDrawCanvas: () => canvasRef.current?.redraw(),
  });

  // 工具函数
  const onExport = () => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    CanvasUtils.download(canvas);
  };

  const onColorChanged = (color: string) => {
    setStrokeColor(color);
    if (drawState.selectedId) {
      setAnnotations((prev) => prev.map((a) => (a.id === drawState.selectedId ? { ...a, color } : a)));
    }
  };
  const onLineWidthChanged = (lineWidth: number) => {
    setLineWidth(lineWidth);
    if (drawState.selectedId) {
      setAnnotations((prev) => prev.map((a) => (a.id === drawState.selectedId ? { ...a, lineWidth } : a)));
    }
  };

  const handleZoomIn = useCallback(() => zoomBy(1.15), [zoomBy]);
  const handleZoomOut = useCallback(() => zoomBy(1 / 1.15), [zoomBy]);

  // 鼠标滚轮缩放
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const nextScale = viewport.scale * delta;
      const scale = CanvasUtils.clampNumber(nextScale, 0.25, 4);
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldX = (screenX - viewport.translateX) / viewport.scale;
      const worldY = (screenY - viewport.translateY) / viewport.scale;
      setViewport({
        scale,
        translateX: screenX - worldX * scale,
        translateY: screenY - worldY * scale,
      });
    },
    [viewport]
  );

  const handleUndo = () => {
    const lastState = undo();
    if (lastState) {
      setAnnotations(lastState);
      resetDrawState();
    }
  };

  const handleRedo = () => {
    const nextState = redo();
    if (nextState) {
      setAnnotations(nextState);
      resetDrawState();
    }
  };

  const deleteSelected = useCallback(() => {
    if (drawState.selectedId) {
      saveHistory();
      setAnnotations((prev) => prev.filter((a) => a.id !== drawState.selectedId));
      resetDrawState();
    }
  }, [drawState.selectedId, saveHistory]);

  const clearCanvas = () => {
    saveHistory();
    setAnnotations([]);
    resetDrawState();
  };

  // 文本工具特殊处理
  const handleTextToolClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (currentTool !== 'text') return;

      const canvas = canvasRef.current?.getCanvas();
      const ctx = canvasRef.current?.getContext();
      if (!canvas || !ctx) return;

      const screen = CanvasUtils.getCanvasPoint(e, canvas);
      const { x, y } = CanvasUtils.screenToWorld(screen, viewport);
      const clickedAnnotation = [...annotations].reverse().find((ann) => CanvasUtils.isOnAnnotation(ann, x, y, ctx, viewport.scale));

      const text = textAreaRef.current?.getText() as TextInputState;
      if (text.visible) {
        if (text.value && text.value.trim()) {
          updateText();
        } else {
          textAreaRef.current?.setText((prev) => ({ ...prev, visible: false }));
        }
      } else {
        // 如果没有选中任何标注,则显示文本框
        !clickedAnnotation && textAreaRef.current?.setText((prev) => ({ ...prev, visible: true, position: { x: screen.x, y: screen.y } }));
      }
    },
    [currentTool, annotations, viewport]
  );

  const updateText = () => {
    const text = textAreaRef.current?.getText() as TextInputState;
    const id = text.id || `${Date.now()}`;
    const worldPos = CanvasUtils.screenToWorld(text.position, viewport);
    // 更新标注后重绘canvas
    setAnnotations((prev) => [
      ...prev,
      {
        id,
        type: 'text',
        x: worldPos.x,
        y: worldPos.y + 16,
        text: text.value,
        color: strokeColor,
      },
    ]);
    textAreaRef.current?.resetText();
    saveHistory();
  };

  useEffect(() => {
    onChange?.(annotations);
  }, [annotations, onChange]);
  useEffect(() => {
    if (Array.isArray(value)) {
      setAnnotations(value);
    }
  }, [value]);

  useEffect(() => {
    resetDrawState();
    if (textAreaRef.current?.getText()?.visible) {
      textAreaRef.current?.setText((text) => ({ ...text, visible: false }));
    }
  }, [currentTool, resetDrawState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const text = textAreaRef.current?.getText();
      if (currentTool === 'text' && text?.visible) {
        return;
      }
      if (e.key === 'Delete') {
        deleteSelected();
      } else if (e.ctrlKey && e.key === 'z') {
        handleUndo();
      } else if (e.ctrlKey && e.key === 'y') {
        handleRedo();
      } else if (e.key === 'Escape') {
        if (currentTool === 'text' && text?.visible) {
          textAreaRef.current?.setText({ ...text, visible: false });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, handleUndo, handleRedo, currentTool]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePanning(true);
      }
      if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        handleZoomIn();
      } else if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        setViewport({ scale: 1, translateX: 0, translateY: 0 });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePanning(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleZoomIn, handleZoomOut]);

  return (
    <div className={`image-annotation ${className}`}>
      <ToolBar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        onClear={clearCanvas}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExport={onExport}
        onUpload={onUpload}
        history={{ canRedo, canUndo }}
        strokeColor={strokeColor}
        lineWidth={lineWidth}
        onColorChange={onColorChanged}
        onLineWidthChange={onLineWidthChanged}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        zoomRatio={viewport.scale * 100}
      />
      <div className="image-container">
        <AnnotationCanvas
          ref={canvasRef}
          src={src}
          annotations={annotations}
          drawState={drawState}
          currentTool={currentTool}
          strokeColor={strokeColor}
          lineWidth={lineWidth}
          viewport={viewport}
          onWheel={handleWheel}
          onMouseDown={(e) => {
            mouseEvents.handleMouseDown(e);
            if (currentTool === 'text') {
              handleTextToolClick(e);
            }
          }}
          onMouseMove={mouseEvents.handleMouseMove}
          onMouseUp={mouseEvents.handleMouseUp}
          onContextMenu={(e) => {
            mouseEvents.handleContextMenu(e);
            if (currentTool === 'text') {
              handleTextToolClick(e);
            }
          }}
        />
        <TextAnnotationInput
          ref={textAreaRef}
          annotations={annotations}
          defaultColor={strokeColor}
          updateText={updateText}
          ctxRef={{ current: canvasRef.current?.getContext() || null }}
          canvasRef={{ current: canvasRef.current?.getCanvas() || null }}
        />
      </div>
    </div>
  );
};

export default ImageAnnotation;
