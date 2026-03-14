import type { Annotation, CircleAnnotation, ArrowAnnotation, RectangleAnnotation, ToolType } from '../types/annotations';
import type { Point } from '../types/annotations';

export interface ViewportTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export const TEXT_FONT: string = '16px Arial';
export const TEXT_LINE_HEIGHT: number = 20;

export function getWorldTextFont(viewportScale: number) {
  const safeScale = viewportScale > 0 ? viewportScale : 1;
  return `${16 / safeScale}px Arial`;
}

export function getWorldTextLineHeight(viewportScale: number) {
  const safeScale = viewportScale > 0 ? viewportScale : 1;
  return 20 / safeScale;
}

export const measureMultilineText = (ctx: CanvasRenderingContext2D, text: string, viewportScale: number = 1) => {
  ctx.font = viewportScale === 1 ? TEXT_FONT : getWorldTextFont(viewportScale);
  const lines = text.split('\n');
  let maxWidth = 0;
  for (let i = 0; i < lines.length; i++) {
    const metrics = ctx.measureText(lines[i]);
    maxWidth = Math.max(maxWidth, metrics.width);
  }
  const lineHeight = viewportScale === 1 ? TEXT_LINE_HEIGHT : getWorldTextLineHeight(viewportScale);
  return { width: maxWidth, height: lines.length * lineHeight };
};

export const getCanvasPoint = (e: React.MouseEvent, canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

export function screenToWorld(point: Point, viewport: ViewportTransform): Point {
  const { scale, translateX, translateY } = viewport;
  const safeScale = scale || 1;
  return {
    x: (point.x - translateX) / safeScale,
    y: (point.y - translateY) / safeScale,
  };
}

export function worldToScreen(point: Point, viewport: ViewportTransform): Point {
  const { scale, translateX, translateY } = viewport;
  return {
    x: point.x * scale + translateX,
    y: point.y * scale + translateY,
  };
}

export function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function getRectRotatedCorners(ann: RectangleAnnotation): { x: number; y: number }[] {
  const rot = ann.rotation ?? 0;
  const cx = ann.x + ann.width / 2;
  const cy = ann.y + ann.height / 2;
  const hw = ann.width / 2;
  const hh = ann.height / 2;
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return corners.map((p) => ({
    x: cx + p.x * cos - p.y * sin,
    y: cy + p.x * sin + p.y * cos,
  }));
}

export const getBoundingBox = (ann: Annotation, ctx: CanvasRenderingContext2D, viewportScale: number = 1) => {
  if (ann.type === 'rectangle') {
    const rot = ann.rotation ?? 0;
    if (Math.abs(rot) < 1e-6) {
      return { x: ann.x, y: ann.y, width: ann.width, height: ann.height };
    }
    const corners = getRectRotatedCorners(ann);
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  } else if (ann.type === 'circle') {
    return {
      x: ann.x - ann.radius,
      y: ann.y - ann.radius,
      width: ann.radius * 2,
      height: ann.radius * 2,
    };
  } else if (ann.type === 'arrow') {
    const minX = Math.min(ann.x, ann.toX);
    const minY = Math.min(ann.y, ann.toY);
    const maxX = Math.max(ann.x, ann.toX);
    const maxY = Math.max(ann.y, ann.toY);
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  } else if (ann.type === 'text') {
    const { width: maxWidth, height: totalHeight } = measureMultilineText(ctx, ann.text, viewportScale);
    const lineHeight = viewportScale === 1 ? TEXT_LINE_HEIGHT : getWorldTextLineHeight(viewportScale);
    return {
      x: ann.x,
      y: ann.y - lineHeight,
      width: maxWidth,
      height: totalHeight,
    };
  }
  return { x: 0, y: 0, width: 0, height: 0 };
};

const HANDLE_HIT_RADIUS = 8;

export interface EditHandleHit {
  type: 'resize' | 'rotate';
  index?: number;
  corner?: 'nw' | 'ne' | 'sw' | 'se';
}

/** 检测点击是否命中可编辑图形（矩形/圆/箭头）的手柄，返回 resize/rotate 及索引 */
export function hitTestEditHandle(
  ann: Annotation,
  x: number,
  y: number,
  ctx: CanvasRenderingContext2D,
  viewportScale: number = 1
): EditHandleHit | null {
  if (ann.type === 'freehand' || ann.type === 'text') return null;

  const hit = (px: number, py: number) => {
    const d = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
    return d < HANDLE_HIT_RADIUS;
  };

  if (ann.type === 'rectangle') {
    const rot = ann.rotation ?? 0;
    const cx = ann.x + ann.width / 2;
    const cy = ann.y + ann.height / 2;
    const offset = 20;
    const rotHandleX = cx - Math.sin(rot) * offset;
    const rotHandleY = cy + Math.cos(rot) * offset;
    if (hit(rotHandleX, rotHandleY)) return { type: 'rotate' };
    const corners = getRectRotatedCorners(ann);
    const cornerNames: Array<'nw' | 'ne' | 'se' | 'sw'> = ['nw', 'ne', 'se', 'sw'];
    for (let i = 0; i < 4; i++) {
      if (hit(corners[i].x, corners[i].y)) return { type: 'resize', index: i, corner: cornerNames[i] };
    }
    return null;
  }

  if (ann.type === 'circle') {
    const r = ann.radius;
    const resizeX = ann.x + r;
    const resizeY = ann.y;
    if (hit(resizeX, resizeY)) return { type: 'resize', index: 0 };
    return null;
  }

  if (ann.type === 'arrow') {
    const startX = ann.x;
    const startY = ann.y;
    const endX = ann.toX;
    const endY = ann.toY;
    if (hit(startX, startY)) return { type: 'resize', index: 0 };
    if (hit(endX, endY)) return { type: 'resize', index: 1 };
    return null;
  }

  return null;
}

export const isInControlPoint = (ann: Annotation, x: number, y: number, ctx: CanvasRenderingContext2D, viewportScale: number = 1) => {
  return hitTestEditHandle(ann, x, y, ctx, viewportScale) !== null;
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

export const isOnAnnotation = (ann: Annotation, x: number, y: number, ctx: CanvasRenderingContext2D, viewportScale: number = 1) => {
  if (ann.type === 'rectangle') {
    const rot = (ann as RectangleAnnotation).rotation ?? 0;
    if (Math.abs(rot) >= 1e-6) {
      const corners = getRectRotatedCorners(ann as RectangleAnnotation);
      const threshold = 6;
      for (let i = 0; i < 4; i++) {
        const p1 = corners[i];
        const p2 = corners[(i + 1) % 4];
        if (isPointNearLine(x, y, p1.x, p1.y, p2.x, p2.y, threshold)) return true;
      }
      return false;
    }
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
    return isPointNearLine(x, y, ann.x, ann.y, ann.toX, ann.toY);
  } else if (ann.type === 'text') {
    const boundingBox = getBoundingBox(ann, ctx, viewportScale);
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

const MIN_SIZE = 5;

/** 世界坐标转矩形局部坐标（相对于中心） */
function worldToRectLocal(px: number, py: number, ann: RectangleAnnotation): { x: number; y: number } {
  const cx = ann.x + ann.width / 2;
  const cy = ann.y + ann.height / 2;
  const rot = ann.rotation ?? 0;
  const cos = Math.cos(-rot);
  const sin = Math.sin(-rot);
  const dx = px - cx;
  const dy = py - cy;
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

/** 根据矩形角点拖动更新矩形（固定对角不变），支持旋转 */
export function applyRectResize(
  ann: RectangleAnnotation,
  handleIndex: number,
  newX: number,
  newY: number
): RectangleAnnotation {
  const rot = ann.rotation ?? 0;
  const { width: w, height: h } = ann;
  const cx = ann.x + w / 2;
  const cy = ann.y + h / 2;

  const local = worldToRectLocal(newX, newY, ann);
  const hw = w / 2;
  const hh = h / 2;

  let nw = w;
  let nh = h;
  let newCx = cx;
  let newCy = cy;

  if (handleIndex === 0) {
    nw = hw - local.x;
    nh = hh - local.y;
    if (nw >= MIN_SIZE && nh >= MIN_SIZE) {
      newCx = cx + (local.x + hw) / 2 * Math.cos(rot) - (local.y + hh) / 2 * Math.sin(rot);
      newCy = cy + (local.x + hw) / 2 * Math.sin(rot) + (local.y + hh) / 2 * Math.cos(rot);
      return { ...ann, x: newCx - nw / 2, y: newCy - nh / 2, width: nw, height: nh };
    }
  } else if (handleIndex === 1) {
    nw = local.x - (-hw);
    nh = hh - local.y;
    if (nw >= MIN_SIZE && nh >= MIN_SIZE) {
      newCx = cx + (local.x - hw) / 2 * Math.cos(rot) - (local.y + hh) / 2 * Math.sin(rot);
      newCy = cy + (local.x - hw) / 2 * Math.sin(rot) + (local.y + hh) / 2 * Math.cos(rot);
      return { ...ann, x: newCx - nw / 2, y: newCy - nh / 2, width: nw, height: nh };
    }
  } else if (handleIndex === 2) {
    nw = local.x + hw;
    nh = local.y + hh;
    if (nw >= MIN_SIZE && nh >= MIN_SIZE) {
      newCx = cx + (local.x - hw) / 2 * Math.cos(rot) - (local.y - hh) / 2 * Math.sin(rot);
      newCy = cy + (local.x - hw) / 2 * Math.sin(rot) + (local.y - hh) / 2 * Math.cos(rot);
      return { ...ann, x: newCx - nw / 2, y: newCy - nh / 2, width: nw, height: nh };
    }
  } else if (handleIndex === 3) {
    nw = hw - local.x;
    nh = local.y + hh;
    if (nw >= MIN_SIZE && nh >= MIN_SIZE) {
      newCx = cx + (local.x + hw) / 2 * Math.cos(rot) - (local.y - hh) / 2 * Math.sin(rot);
      newCy = cy + (local.x + hw) / 2 * Math.sin(rot) + (local.y - hh) / 2 * Math.cos(rot);
      return { ...ann, x: newCx - nw / 2, y: newCy - nh / 2, width: nw, height: nh };
    }
  }
  return ann;
}

/** 根据圆周上的拖拽更新圆的半径 */
export function applyCircleResize(ann: CircleAnnotation, newX: number, newY: number): CircleAnnotation {
  const r = Math.sqrt((newX - ann.x) ** 2 + (newY - ann.y) ** 2);
  if (r < MIN_SIZE) return ann;
  return { ...ann, radius: r };
}

/** 根据箭头端点拖拽更新箭头 */
export function applyArrowResize(ann: ArrowAnnotation, handleIndex: number, newX: number, newY: number): ArrowAnnotation {
  if (handleIndex === 0) {
    return { ...ann, x: newX, y: newY };
  }
  return { ...ann, toX: newX, toY: newY };
}

/** 矩形绕中心旋转，deltaAngle 为相对初始的增量弧度 */
export function applyRectRotate(ann: RectangleAnnotation, deltaAngle: number): RectangleAnnotation {
  return { ...ann, rotation: (ann.rotation ?? 0) + deltaAngle };
}

/** 箭头绕中点旋转，deltaAngle 为弧度增量，保持长度不变 */
export function applyArrowRotate(ann: ArrowAnnotation, deltaAngle: number): ArrowAnnotation {
  const len = Math.sqrt((ann.toX - ann.x) ** 2 + (ann.toY - ann.y) ** 2);
  if (len < 1) return ann;
  const curAngle = Math.atan2(ann.toY - ann.y, ann.toX - ann.x);
  const newAngle = curAngle + deltaAngle;
  return { ...ann, toX: ann.x + len * Math.cos(newAngle), toY: ann.y + len * Math.sin(newAngle) };
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
  if (tool === 'arrow') {
    return { ...common, x: startX, y: startY, toX: startX + width, toY: startY + height };
  }
  return { ...common, x: startX, y: startY, width, height };
}
