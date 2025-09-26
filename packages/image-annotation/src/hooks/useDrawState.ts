import { useState, useCallback } from 'react';
import type { ToolType } from '../types/annotations';

export interface DrawState {
  isDrawing: boolean;
  isDragging: boolean;
  startPos: { x: number; y: number };
  currentPos: { x: number; y: number };
  freehandPath: Array<{ x: number; y: number }>;
  selectedId: string | null;
}

const initialState: DrawState = {
  isDrawing: false,
  isDragging: false,
  startPos: { x: 0, y: 0 },
  currentPos: { x: 0, y: 0 },
  freehandPath: [],
  selectedId: null,
};

export function useDrawState() {
  const [drawState, setDrawState] = useState<DrawState>(initialState);

  const resetDrawState = useCallback(() => {
    setDrawState(initialState);
  }, []);

  const updateDrawState = useCallback((updates: Partial<DrawState>) => {
    setDrawState((prev) => ({ ...prev, ...updates }));
  }, []);

  const startDrawing = useCallback((x: number, y: number, tool: ToolType, selectedId?: string | null) => {
    setDrawState({
      isDrawing: !selectedId,
      isDragging: !!selectedId,
      startPos: { x, y },
      currentPos: { x, y },
      freehandPath: tool === 'freehand' ? [{ x, y }] : [],
      selectedId: selectedId || null,
    });
  }, []);

  const updateCurrentPos = useCallback((x: number, y: number, tool: ToolType) => {
    setDrawState((prev) => ({
      ...prev,
      currentPos: { x, y },
      freehandPath: tool === 'freehand' ? [...prev.freehandPath, { x, y }] : prev.freehandPath,
    }));
  }, []);

  const finishDrawing = useCallback(() => {
    setDrawState((prev) => ({
      ...prev,
      isDrawing: false,
      isDragging: false,
      freehandPath: [],
      startPos: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 },
    }));
  }, []);

  return {
    drawState,
    resetDrawState,
    updateDrawState,
    startDrawing,
    updateCurrentPos,
    finishDrawing,
  };
}
