import { useCallback, useMemo, useRef } from 'react';
import type { Annotation, ArrowAnnotation, RectangleAnnotation, ToolType } from '../types/annotations';
import * as CanvasUtils from '../utils/canvasUtils';
import type { DrawState, EditAction } from './useDrawState';

interface UseMouseEventsProps {
  annotations: Annotation[];
  currentTool: ToolType;
  drawState: DrawState;
  strokeColor: string;
  lineWidth: number;
  viewport: CanvasUtils.ViewportTransform;
  onUpdateViewport: (updater: (prev: CanvasUtils.ViewportTransform) => CanvasUtils.ViewportTransform) => void;
  isSpacePanning: boolean;
  onStartDrawing: (x: number, y: number, tool: ToolType, selectedId?: string | null, editAction?: EditAction, resizeHandle?: number | null) => void;
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
  viewport,
  onUpdateViewport,
  isSpacePanning,
  onStartDrawing,
  onUpdateCurrentPos,
  onFinishDrawing,
  onUpdateAnnotations,
  onSaveHistory,
}: UseMouseEventsProps) {
  const dragLastPosRef = useRef<{ x: number; y: number } | null>(null);
  const panLastPosRef = useRef<{ x: number; y: number } | null>(null);
  const isPanningRef = useRef(false);
  const rotateStartAngleRef = useRef<number | null>(null);
  const hasEditChangedRef = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.detail === 2 || e.button === 2) return;
      const canvas = e.currentTarget;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const screen = CanvasUtils.getCanvasPoint(e, canvas);
      const { x, y } = CanvasUtils.screenToWorld(screen, viewport);

      const isMiddleMouse = e.button === 1;
      if (isSpacePanning || isMiddleMouse) {
        isPanningRef.current = true;
        panLastPosRef.current = screen;
        return;
      }

      if (!currentTool) return;

      const selectedAnn = annotations.find((a) => a.id === drawState.selectedId);
      if (selectedAnn && (selectedAnn.type === 'rectangle' || selectedAnn.type === 'arrow' || selectedAnn.type === 'circle')) {
        const handleHit = CanvasUtils.hitTestEditHandle(selectedAnn, x, y, ctx, viewport.scale);
        if (handleHit) {
          hasEditChangedRef.current = false;
          dragLastPosRef.current = { x, y };
          if (handleHit.type === 'rotate') {
            rotateStartAngleRef.current =
              selectedAnn.type === 'rectangle'
                ? Math.atan2(y - (selectedAnn.y + selectedAnn.height / 2), x - (selectedAnn.x + selectedAnn.width / 2))
                : null;
            onStartDrawing(x, y, currentTool, selectedAnn.id, 'rotate', null);
            return;
          }
          onStartDrawing(x, y, currentTool, selectedAnn.id, 'resize', handleHit.index ?? 0);
          return;
        }
      }

      const clickedAnnotation = [...annotations].reverse().find((ann) => CanvasUtils.isOnAnnotation(ann, x, y, ctx, viewport.scale));
      if (clickedAnnotation) {
        hasEditChangedRef.current = false;
        dragLastPosRef.current = { x, y };
        onStartDrawing(x, y, currentTool, clickedAnnotation.id, 'move', null);
        return;
      }

      onStartDrawing(x, y, currentTool, null, null, null);
    },
    [annotations, currentTool, drawState.selectedId, isSpacePanning, onStartDrawing, viewport]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = e.currentTarget;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const screen = CanvasUtils.getCanvasPoint(e, canvas);
      const { x, y } = CanvasUtils.screenToWorld(screen, viewport);
      const selectedAnn = annotations.find((a) => a.id === drawState.selectedId);
      const { isDragging, selectedId, isDrawing, editAction, resizeHandle } = drawState;
      const handleHit = selectedAnn && (selectedAnn.type === 'rectangle' || selectedAnn.type === 'circle' || selectedAnn.type === 'arrow')
        ? CanvasUtils.hitTestEditHandle(selectedAnn, x, y, ctx, viewport.scale)
        : null;
      const isOnAnnotation = annotations.some((ann) => CanvasUtils.isOnAnnotation(ann, x, y, ctx, viewport.scale));
      if (handleHit) {
        if (handleHit.type === 'rotate') {
          canvas.style.cursor = editAction === 'rotate' ? 'grabbing' : 'grab';
        } else if (handleHit.corner) {
          const cursors: Record<string, string> = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' };
          canvas.style.cursor = cursors[handleHit.corner] || 'nwse-resize';
        } else if (selectedAnn?.type === 'circle') {
          canvas.style.cursor = 'ew-resize';
        } else {
          canvas.style.cursor = 'nwse-resize';
        }
      }
      else if (isOnAnnotation) canvas.style.cursor = 'move';
      else canvas.style.cursor = 'crosshair';

      if (isPanningRef.current) {
        const last = panLastPosRef.current || screen;
        const dx = screen.x - last.x;
        const dy = screen.y - last.y;
        if (!CanvasUtils.isSignificantDrag(dx, dy)) return;
        onUpdateViewport((prev) => ({ ...prev, translateX: prev.translateX + dx, translateY: prev.translateY + dy }));
        panLastPosRef.current = screen;
        return;
      }

      if (editAction === 'resize' && selectedId && resizeHandle !== null && selectedAnn) {
        const last = dragLastPosRef.current || { x, y };
        if (!CanvasUtils.isSignificantDrag(x - last.x, y - last.y)) return;
        hasEditChangedRef.current = true;
        onUpdateAnnotations((list) =>
          list.map((ann) => {
            if (ann.id !== selectedId) return ann;
            if (ann.type === 'rectangle') return CanvasUtils.applyRectResize(ann, resizeHandle, x, y);
            if (ann.type === 'circle') return CanvasUtils.applyCircleResize(ann, x, y);
            if (ann.type === 'arrow') return CanvasUtils.applyArrowResize(ann, resizeHandle, x, y);
            return ann;
          })
        );
        dragLastPosRef.current = { x, y };
        return;
      }

      if (editAction === 'rotate' && selectedId && selectedAnn) {
        if (selectedAnn.type === 'circle') return;
        const startAngle = rotateStartAngleRef.current;
        if (startAngle === null) return;
        const cx =
          selectedAnn.type === 'rectangle'
            ? (selectedAnn as RectangleAnnotation).x + (selectedAnn as RectangleAnnotation).width / 2
            : ((selectedAnn as ArrowAnnotation).x + (selectedAnn as ArrowAnnotation).toX) / 2;
        const cy =
          selectedAnn.type === 'rectangle'
            ? (selectedAnn as RectangleAnnotation).y + (selectedAnn as RectangleAnnotation).height / 2
            : ((selectedAnn as ArrowAnnotation).y + (selectedAnn as ArrowAnnotation).toY) / 2;
        const curAngle = Math.atan2(y - cy, x - cx);
        const delta = curAngle - startAngle;
        rotateStartAngleRef.current = curAngle;
        if (Math.abs(delta) < 0.01) return;
        hasEditChangedRef.current = true;
        onUpdateAnnotations((list) =>
          list.map((ann) => {
            if (ann.id !== selectedId) return ann;
            if (ann.type === 'rectangle') return CanvasUtils.applyRectRotate(ann, delta);
            if (ann.type === 'arrow') return CanvasUtils.applyArrowRotate(ann, delta);
            return ann;
          })
        );
        dragLastPosRef.current = { x, y };
        return;
      }

      if (isDragging && selectedId && editAction !== 'resize' && editAction !== 'rotate') {
        const last = dragLastPosRef.current || { x, y };
        const dx = x - last.x;
        const dy = y - last.y;

        if (!CanvasUtils.isSignificantDrag(dx, dy)) return;

        hasEditChangedRef.current = true;
        onUpdateAnnotations((annList) =>
          annList.map((ann) => {
            if (ann.id !== selectedId) return ann;
            if (ann.type === 'freehand') {
              return {
                ...ann,
                points: ann.points.map((p: any) => ({ x: p.x + dx, y: p.y + dy })),
              };
            }
            if (ann.type === 'arrow') {
              return { ...ann, x: ann.x + dx, y: ann.y + dy, toX: ann.toX + dx, toY: ann.toY + dy };
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
    [annotations, currentTool, drawState, onUpdateAnnotations, onUpdateCurrentPos, onUpdateViewport, viewport]
  );

  const handleMouseUp = useCallback(() => {
    const { startPos, currentPos, isDrawing, isDragging } = drawState;

    if (isPanningRef.current) {
      isPanningRef.current = false;
      panLastPosRef.current = null;
      dragLastPosRef.current = null;
      return;
    }

    if (isDragging) {
      if (hasEditChangedRef.current) onSaveHistory();
      hasEditChangedRef.current = false;
      onFinishDrawing();
      dragLastPosRef.current = null;
      rotateStartAngleRef.current = null;
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
