import { useState, useCallback } from 'react';
import type { Annotation } from '../types/annotations';
import * as CanvasUtils from '../utils/canvasUtils';

export function useHistory(annotations: Annotation[]) {
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [redoHistory, setRedoHistory] = useState<Annotation[][]>([]);

  const saveHistory = useCallback(() => {
    setHistory((prev) => [...prev, annotations.map(CanvasUtils.cloneAnnotation)]);
    setRedoHistory([]);
  }, [annotations]);

  const undo = useCallback(() => {
    if (history.length > 0) {
      const lastState = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setRedoHistory((prev) => [...prev, annotations.map(CanvasUtils.cloneAnnotation)]);
      return lastState;
    }
  }, [history, annotations]);

  const redo = useCallback(() => {
    if (redoHistory.length > 0) {
      const nextState = redoHistory[redoHistory.length - 1];
      setRedoHistory((prev) => prev.slice(0, -1));
      setHistory((prev) => [...prev, annotations.map(CanvasUtils.cloneAnnotation)]);
      return nextState;
    }
  }, [redoHistory, annotations]);

  const canUndo = history.length > 0;
  const canRedo = redoHistory.length > 0;

  return {
    saveHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
