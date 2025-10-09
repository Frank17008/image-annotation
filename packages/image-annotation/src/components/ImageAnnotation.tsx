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
}

const ImageAnnotation: React.FC<ImageAnnotationProps> = ({ src, className = '', onChange }) => {
  const idRef = useRef(0);
  const nextId = useCallback(() => `${Date.now()}-${idRef.current++}`, []);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolType>(null);
  const [strokeColor, setStrokeColor] = useState<string>('#FF0000');
  const [lineWidth, setLineWidth] = useState<number>(2);

  const textAreaRef = useRef<TextAnnotationInputHandle | null>(null);
  const canvasRef = useRef<AnnotationCanvasHandle | null>(null);

  const { drawState, startDrawing, updateCurrentPos, finishDrawing, resetDrawState } = useDrawState();
  const { saveHistory, undo, redo, canUndo, canRedo } = useHistory(annotations);

  // 鼠标事件处理
  const mouseEvents = useMouseEvents({
    annotations,
    currentTool,
    drawState,
    strokeColor,
    lineWidth,
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

      const { x, y } = CanvasUtils.getCanvasPoint(e, canvas);
      const clickedAnnotation = [...annotations].reverse().find((ann) => CanvasUtils.isOnAnnotation(ann, x, y, ctx));

      const text = textAreaRef.current?.getText() as TextInputState;
      if (text.visible) {
        if (text.value && text.value.trim()) {
          updateText();
        } else {
          textAreaRef.current?.setText((prev) => ({ ...prev, visible: false }));
        }
      } else {
        // 如果没有选中任何标注,则显示文本框
        !clickedAnnotation && textAreaRef.current?.setText((prev) => ({ ...prev, visible: true, position: { x, y } }));
      }
    },
    [currentTool, annotations, strokeColor, saveHistory, nextId]
  );

  const updateText = () => {
    const text = textAreaRef.current?.getText() as TextInputState;
    const id = text.id || nextId();
    // 更新标注后重绘canvas
    setAnnotations((prev) => [
      ...prev,
      {
        id,
        type: 'text',
        x: text.position.x,
        y: text.position.y + 16,
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

  // 修改选中标注的颜色和线宽
  useEffect(() => {
    if (drawState.selectedId) {
      setAnnotations((prev) => prev.map((a) => (a.id === drawState.selectedId ? { ...a, color: strokeColor, lineWidth } : a)));
    }
  }, [strokeColor, lineWidth, drawState.selectedId]);

  return (
    <div className={`image-annotation ${className}`}>
      <ToolBar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        onClear={clearCanvas}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExport={onExport}
        history={{ canRedo, canUndo }}
        strokeColor={strokeColor}
        lineWidth={lineWidth}
        onColorChange={setStrokeColor}
        onLineWidthChange={setLineWidth}
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
