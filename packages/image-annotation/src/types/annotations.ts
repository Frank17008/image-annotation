export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id?: string;
  color: string;
  lineWidth?: number;
}

export interface RectangleAnnotation extends BaseAnnotation {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleAnnotation extends BaseAnnotation {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  x: number;
  y: number;
  text: string;
}

export interface FreehandAnnotation extends BaseAnnotation {
  type: 'freehand';
  points: Point[];
}

export type Annotation = RectangleAnnotation | CircleAnnotation | ArrowAnnotation | TextAnnotation | FreehandAnnotation;

export interface ArrowDrawingPayload {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
}

export type ToolType = 'rectangle' | 'circle' | 'arrow' | 'text' | 'freehand' | null;
