import type { ArrowDrawingPayload, CircleAnnotation, FreehandAnnotation, RectangleAnnotation, TextAnnotation } from '../types/annotations';

export const drawArrow = (ctx: CanvasRenderingContext2D, annotation: ArrowDrawingPayload, lineWidth: number): void => {
  const { fromX, fromY, toX, toY, color } = annotation;
  if (Math.abs(toX - fromX) < 5 && Math.abs(toY - fromY) < 5) return;
  const headLength = 15;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
};

export const drawCircle = (ctx: CanvasRenderingContext2D, annotation: CircleAnnotation, lineWidth: number): void => {
  ctx.strokeStyle = annotation.color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(annotation.x, annotation.y, annotation.radius, 0, Math.PI * 2);
  ctx.stroke();
};

export const drawFreehand = (ctx: CanvasRenderingContext2D, annotation: FreehandAnnotation, lineWidth: number): void => {
  if (!annotation.points.length) return;
  ctx.strokeStyle = annotation.color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
  for (let i = 1; i < annotation.points.length; i++) {
    ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
  }
  ctx.stroke();
};

export const drawRectangle = (ctx: CanvasRenderingContext2D, annotation: RectangleAnnotation, lineWidth: number): void => {
  ctx.strokeStyle = annotation.color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
};

export const drawText = (ctx: CanvasRenderingContext2D, annotation: TextAnnotation): void => {
  ctx.fillStyle = annotation.color;
  ctx.font = '16px Arial';
  const lines = annotation.text.split('\n');
  let yPos = annotation.y;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], annotation.x, yPos);
    yPos += 20;
  }
};
