import { useCallback, useMemo, useRef } from 'react';
import type { Annotation, ToolType } from '../types/annotations';
import * as CanvasUtils from '../utils/canvasUtils';
import type { DrawState } from './useDrawState';

interface UseMouseEventsProps {
  annotations: Annotation[];
  currentTool: ToolType;
  drawState: DrawState;
  strokeColor: string;
  lineWidth: number;
  onStartDrawing: (x: number, y: number, tool: ToolType, selectedId?: string | null) => void;
  onUpdateCurrentPos: (x: number, y: number, tool: ToolType) => void;
  onFinishDrawing: () => void;
  onUpdateAnnotations: (updater: (prev: Annotation[]) => Annotation[]) => void;
  onSaveHistory: () => void;
  onDrawCanvas: () => void;
}

export function useMouseEvents({
  annotations,
  currentTool,
  drawState,
  strokeColor,
  lineWidth,
  onStartDrawing,
  onUpdateCurrentPos,
  onFinishDrawing,
  onUpdateAnnotations,
  onSaveHistory,
}: UseMouseEventsProps) {
  // 独立记录拖动时上一帧的鼠标位置，避免依赖外部 state 造成累计偏移
  const dragLastPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.detail === 2 || e.button === 2 || !currentTool) return;
      const canvas = e.currentTarget;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { x, y } = CanvasUtils.getCanvasPoint(e, canvas);
      const clickedAnnotation = [...annotations].reverse().find((ann) => CanvasUtils.isOnAnnotation(ann, x, y, ctx));

      // 如果点击了标注，允许拖动
      if (clickedAnnotation) {
        dragLastPosRef.current = { x, y };
        onStartDrawing(x, y, currentTool, clickedAnnotation.id);
        return;
      }

      // 开始绘制新图形
      onStartDrawing(x, y, currentTool, null);
    },
    [annotations, currentTool, onStartDrawing]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = e.currentTarget;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { x, y } = CanvasUtils.getCanvasPoint(e, canvas);
      const isOnAnnotation = annotations.some((ann) => CanvasUtils.isOnAnnotation(ann, x, y, ctx));

      canvas.style.cursor = isOnAnnotation ? 'move' : 'crosshair';

      const { isDragging, selectedId, currentPos, isDrawing } = drawState;

      if (isDragging && selectedId) {
        const last = dragLastPosRef.current || { x, y };
        const dx = x - last.x;
        const dy = y - last.y;

        if (!CanvasUtils.isSignificantDrag(dx, dy)) return;

        onUpdateAnnotations((annList) =>
          annList.map((ann) => {
            if (ann.id !== selectedId) return ann;
            if (ann.type === 'freehand') {
              return {
                ...ann,
                points: ann.points.map((p: any) => ({ x: p.x + dx, y: p.y + dy })),
              };
            }
            return { ...ann, x: ann.x + dx, y: ann.y + dy };
          })
        );
        // 更新拖动参考点为本次位置，避免累计偏移
        dragLastPosRef.current = { x, y };
        return;
      }

      if (isDrawing && currentTool) {
        onUpdateCurrentPos(x, y, currentTool);
      }
    },
    [annotations, currentTool, drawState, onUpdateCurrentPos, onUpdateAnnotations]
  );

  const handleMouseUp = useCallback(() => {
    const { startPos, currentPos, isDrawing, isDragging } = drawState;

    if (isDragging) {
      onSaveHistory();
      onFinishDrawing();
      dragLastPosRef.current = null;
      return;
    }

    if (!isDrawing || !currentTool) return;

    const width = currentPos.x - startPos.x;
    const height = currentPos.y - startPos.y;

    if (CanvasUtils.shouldCommitShape(currentTool, width, height)) {
      onSaveHistory();
      const newAnnotation = CanvasUtils.createNewAnnotation({
        id: `${Date.now()}`,
        tool: currentTool,
        startX: startPos.x,
        startY: startPos.y,
        width,
        height,
        color: strokeColor,
        lineWidth: lineWidth,
        freehandPath: drawState.freehandPath,
      });

      onUpdateAnnotations((prev) => [...prev, newAnnotation]);
    }

    onFinishDrawing();
    dragLastPosRef.current = null;
  }, [drawState, currentTool, strokeColor, lineWidth, onSaveHistory, onFinishDrawing, onUpdateAnnotations]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      onFinishDrawing();
    },
    [onFinishDrawing]
  );

  const throttledMouseMove = useMemo(() => CanvasUtils.throttle(handleMouseMove, 50), [handleMouseMove]);

  return {
    handleMouseDown,
    handleMouseMove: throttledMouseMove,
    handleMouseUp,
    handleContextMenu,
  };
}
