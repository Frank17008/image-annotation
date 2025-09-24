import type { Annotation } from '../types/annotations';

export const drawControlPoint = (ctx: CanvasRenderingContext2D, x: number, y: number, color1: string = '#FF0000', color2: string = '#FFFFFF'): void => {
  ctx.fillStyle = color2;
  ctx.strokeStyle = color1;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
};

export const getBoundingBox = (ann: Annotation, ctx: CanvasRenderingContext2D): { x: number; y: number; width: number; height: number } => {
  if (ann.type === 'rectangle') {
    return { x: ann.x, y: ann.y, width: ann.width, height: ann.height };
  } else if (ann.type === 'circle') {
    return {
      x: ann.x - ann.radius,
      y: ann.y - ann.radius,
      width: ann.radius * 2,
      height: ann.radius * 2,
    };
  } else if (ann.type === 'arrow') {
    const minX = Math.min(ann.x, ann.x + ann.width);
    const minY = Math.min(ann.y, ann.y + ann.height);
    const maxX = Math.max(ann.x, ann.x + ann.width);
    const maxY = Math.max(ann.y, ann.y + ann.height);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  } else if (ann.type === 'text') {
    ctx.font = '16px Arial';
    const lines = ann.text.split('\n');
    const lineHeight = 20;
    const totalHeight = lines.length * lineHeight;
    let maxWidth = 0;
    for (let i = 0; i < lines.length; i++) {
      const metrics = ctx.measureText(lines[i]);
      maxWidth = Math.max(maxWidth, metrics.width);
    }
    return { x: ann.x, y: ann.y - lineHeight, width: maxWidth, height: totalHeight };
  }
  return { x: 0, y: 0, width: 0, height: 0 };
};
