import type { Annotation, ToolType } from '../types/annotations';

export const TEXT_FONT: string = '16px Arial';
export const TEXT_LINE_HEIGHT: number = 20;

export const measureMultilineText = (ctx: CanvasRenderingContext2D, text: string) => {
  ctx.font = TEXT_FONT;
  const lines = text.split('\n');
  let maxWidth = 0;
  for (let i = 0; i < lines.length; i++) {
    const metrics = ctx.measureText(lines[i]);
    maxWidth = Math.max(maxWidth, metrics.width);
  }
  return { width: maxWidth, height: lines.length * TEXT_LINE_HEIGHT };
};

export const getCanvasPoint = (e: React.MouseEvent, canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

export const getBoundingBox = (ann: Annotation, ctx: CanvasRenderingContext2D) => {
  if (ann.type === 'rectangle') {
    return {
      x: ann.x,
      y: ann.y,
      width: ann.width,
      height: ann.height,
    };
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
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  } else if (ann.type === 'text') {
    const { width: maxWidth, height: totalHeight } = measureMultilineText(ctx, ann.text);
    return {
      x: ann.x,
      y: ann.y - TEXT_LINE_HEIGHT,
      width: maxWidth,
      height: totalHeight,
    };
  }
  return { x: 0, y: 0, width: 0, height: 0 };
};

export const isInControlPoint = (ann: Annotation, x: number, y: number, ctx: CanvasRenderingContext2D) => {
  if (ann.type === 'freehand') return false;
  const boundingBox = getBoundingBox(ann, ctx);
  return (
    (Math.abs(x - boundingBox.x) < 6 && Math.abs(y - boundingBox.y) < 6) ||
    (Math.abs(x - (boundingBox.x + boundingBox.width)) < 6 && Math.abs(y - boundingBox.y) < 6) ||
    (Math.abs(x - (boundingBox.x + boundingBox.width)) < 6 && Math.abs(y - (boundingBox.y + boundingBox.height)) < 6) ||
    (Math.abs(x - boundingBox.x) < 6 && Math.abs(y - (boundingBox.y + boundingBox.height)) < 6)
  );
};

export const isPointNearLine = (x: number, y: number, x1: number, y1: number, x2: number, y2: number, threshold: number = 6) => {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) param = dot / len_sq;
  let xx: number, yy: number;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  const dx = x - xx;
  const dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
};

export const isOnAnnotation = (ann: Annotation, x: number, y: number, ctx: CanvasRenderingContext2D) => {
  if (ann.type === 'rectangle') {
    const lineWidth = 2;
    return (
      (Math.abs(x - ann.x) <= lineWidth && y >= ann.y && y <= ann.y + ann.height) ||
      (Math.abs(x - (ann.x + ann.width)) <= lineWidth && y >= ann.y && y <= ann.y + ann.height) ||
      (Math.abs(y - ann.y) <= lineWidth && x >= ann.x && x <= ann.x + ann.width) ||
      (Math.abs(y - (ann.y + ann.height)) <= lineWidth && x >= ann.x && x <= ann.x + ann.width)
    );
  } else if (ann.type === 'circle') {
    const distance = Math.sqrt((x - ann.x) ** 2 + (y - ann.y) ** 2);
    return Math.abs(distance - ann.radius) <= 2;
  } else if (ann.type === 'arrow') {
    return isPointNearLine(x, y, ann.x, ann.y, ann.x + ann.width, ann.y + ann.height);
  } else if (ann.type === 'text') {
    const boundingBox = getBoundingBox(ann, ctx);
    return x >= boundingBox.x && x <= boundingBox.x + boundingBox.width && y >= boundingBox.y && y <= boundingBox.y + boundingBox.height;
  } else if (ann.type === 'freehand') {
    for (let i = 0; i < ann.points.length - 1; i++) {
      const p1 = ann.points[i];
      const p2 = ann.points[i + 1];
      if (isPointNearLine(x, y, p1.x, p1.y, p2.x, p2.y)) {
        return true;
      }
    }
    return false;
  }
  return false;
};

export const cloneAnnotation = (ann: Annotation): Annotation => {
  if (ann?.type === 'freehand' && Array.isArray(ann.points)) {
    return { ...ann, points: ann.points.map((p) => ({ x: p.x, y: p.y })) };
  }
  return { ...ann };
};

export const download = (canvas: HTMLCanvasElement, filename?: string) => {
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${filename || 'annotated_image.png'}`;
  a.click();
  a.remove();
};

export function throttle(func: (...args: any[]) => any, delay: number) {
  let lastCall = 0;
  return function (this: any, ...args: any[]) {
    const now = new Date().getTime();
    if (now - lastCall >= delay) {
      func.apply(this, args);
      lastCall = now;
    }
  };
}

export function computeImageFit(naturalWidth: number, naturalHeight: number, maxWidth: number, maxHeight: number) {
  if (naturalWidth <= 0 || naturalHeight <= 0 || maxWidth <= 0 || maxHeight <= 0) {
    return { ratio: 1, displayWidth: naturalWidth, displayHeight: naturalHeight, offsetX: 0, offsetY: 0 };
  }
  const ratio = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
  const displayWidth = naturalWidth * ratio;
  const displayHeight = naturalHeight * ratio;
  const offsetX = (maxWidth - displayWidth) / 2;
  const offsetY = (maxHeight - displayHeight) / 2;
  return { ratio, displayWidth, displayHeight, offsetX, offsetY };
}

export function isSignificantDrag(dx: number, dy: number) {
  return Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001;
}

export function shouldCommitShape(tool: ToolType, width: number, height: number) {
  if (!tool) return false;
  if (!['rectangle', 'circle', 'arrow', 'freehand'].includes(tool)) return false;
  return Math.abs(width) > 3 || Math.abs(height) > 3;
}

export function createNewAnnotation(params: {
  id: string;
  tool: ToolType;
  startX: number;
  startY: number;
  width: number;
  height: number;
  color: string;
  lineWidth: number;
  freehandPath: Array<{ x: number; y: number }>;
}): any {
  const { id, tool, startX, startY, width, height, color, lineWidth, freehandPath } = params;
  const common = { id, type: tool, color, lineWidth };
  if (tool === 'freehand') {
    return { ...common, points: [...freehandPath] };
  }
  if (tool === 'circle') {
    const radius = Math.sqrt(width ** 2 + height ** 2);
    return { ...common, x: startX, y: startY, radius };
  }
  return { ...common, x: startX, y: startY, width, height };
}
