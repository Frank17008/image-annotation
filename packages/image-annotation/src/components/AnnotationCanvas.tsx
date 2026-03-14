import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as DrawTools from '../utils/drawTool';
import * as CanvasUtils from '../utils/canvasUtils';
import type { Annotation, ToolType } from '../types/annotations';
import type { DrawState } from '../hooks/useDrawState';

interface AnnotationCanvasProps {
  src: string;
  annotations: Annotation[];
  drawState: DrawState;
  currentTool: ToolType;
  strokeColor: string;
  lineWidth: number;
  viewport: CanvasUtils.ViewportTransform;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onContextMenu: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
}

export interface AnnotationCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
  getContext: () => CanvasRenderingContext2D | null;
  redraw: () => void;
}

const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(
  ({ src, annotations, drawState, currentTool, strokeColor, lineWidth, viewport, onMouseDown, onMouseMove, onMouseUp, onContextMenu }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const reqAniRef = useRef<number | null>(null);

    // 使用 ref 存储最新的状态值，避免频繁重新创建 drawCanvas 函数
    const annotationsRef = useRef(annotations);
    const drawStateRef = useRef(drawState);
    const currentToolRef = useRef(currentTool);
    const strokeColorRef = useRef(strokeColor);
    const lineWidthRef = useRef(lineWidth);
    const viewportRef = useRef(viewport);

    // 更新 ref 值
    annotationsRef.current = annotations;
    drawStateRef.current = drawState;
    currentToolRef.current = currentTool;
    strokeColorRef.current = strokeColor;
    lineWidthRef.current = lineWidth;
    viewportRef.current = viewport;

    const drawImage = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx || !imageRef.current) return;

      const { ratio, displayWidth, displayHeight, offsetX, offsetY } = CanvasUtils.computeImageFit(imageRef.current.naturalWidth, imageRef.current.naturalHeight, canvas.width, canvas.height);

      ctx.drawImage(imageRef.current, offsetX, offsetY, displayWidth, displayHeight);
      canvas.dataset.scale = `${ratio}`;
      canvas.dataset.offsetX = `${offsetX}`;
      canvas.dataset.offsetY = `${offsetY}`;
    }, []);

    const drawCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;

      const parent = canvas.parentElement;
      if (parent) {
        const desiredWidth = Math.max(1, parent.clientWidth || canvas.width || 1);
        const desiredHeight = Math.max(1, parent.clientHeight || canvas.height || 1);
        if (canvas.width !== desiredWidth || canvas.height !== desiredHeight) {
          canvas.width = desiredWidth;
          canvas.height = desiredHeight;
        }
      }

      const { startPos, currentPos, isDrawing, selectedId, freehandPath } = drawStateRef.current;
      const { scale, translateX, translateY } = viewportRef.current;

      if (reqAniRef.current) cancelAnimationFrame(reqAniRef.current);

      reqAniRef.current = requestAnimationFrame(() => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(translateX, translateY);
        ctx.scale(scale, scale);
        drawImage();

        // 绘制已保存的注释
        annotationsRef.current.forEach((ann) => {
          switch (ann.type) {
            case 'rectangle':
              DrawTools.drawRectangle(ctx, ann, ann.lineWidth || lineWidthRef.current);
              break;
            case 'circle':
              DrawTools.drawCircle(ctx, ann, ann.lineWidth || lineWidthRef.current);
              break;
            case 'arrow':
              DrawTools.drawArrow(
                ctx,
                {
                  fromX: ann.x,
                  fromY: ann.y,
                  toX: ann.toX,
                  toY: ann.toY,
                  color: ann.color,
                },
                ann.lineWidth || lineWidthRef.current
              );
              break;
            case 'text':
              DrawTools.drawText(ctx, ann, scale);
              break;
            case 'freehand':
              DrawTools.drawFreehand(ctx, ann, ann.lineWidth || lineWidthRef.current);
              break;
            default:
              break;
          }

          // 绘制选中状态的控制点（resize + rotate）
          if (ann.id === selectedId && ann.type !== 'freehand' && ann.type !== 'text') {
            const boundingBox = CanvasUtils.getBoundingBox(ann, ctx, scale);
            const originalLineWidth = ctx.lineWidth;
            const originalStrokeStyle = ctx.strokeStyle;
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = '#888888';
            ctx.lineWidth = 2;

            if (ann.type === 'rectangle') {
              const corners = CanvasUtils.getRectRotatedCorners(ann);
              ctx.beginPath();
              ctx.moveTo(corners[0].x, corners[0].y);
              corners.forEach((c: { x: number; y: number }, i: number) => {
                if (i > 0) ctx.lineTo(c.x, c.y);
              });
              ctx.closePath();
              ctx.stroke();
              corners.forEach((c: { x: number; y: number }) => DrawTools.drawControlPoint(ctx, c.x, c.y, '#888888'));
              const rot = (ann as any).rotation ?? 0;
              const cx = ann.x + ann.width / 2;
              const cy = ann.y + ann.height / 2;
              const rx = cx - Math.sin(rot) * 20;
              const ry = cy + Math.cos(rot) * 20;
              DrawTools.drawControlPoint(ctx, rx, ry, '#888888');
            } else if (ann.type === 'circle') {
              ctx.beginPath();
              ctx.arc(ann.x, ann.y, ann.radius, 0, Math.PI * 2);
              ctx.stroke();
              DrawTools.drawControlPoint(ctx, ann.x + ann.radius, ann.y, '#888888');
            } else if (ann.type === 'arrow') {
              DrawTools.drawControlPoint(ctx, ann.x, ann.y, '#888888');
              DrawTools.drawControlPoint(ctx, ann.toX, ann.toY, '#888888');
            }

            ctx.setLineDash([]);
            ctx.lineWidth = originalLineWidth;
            ctx.strokeStyle = originalStrokeStyle;
          }
        });

        // 绘制正在绘制的形状
        if (isDrawing && currentToolRef.current) {
          const width = currentPos.x - startPos.x;
          const height = currentPos.y - startPos.y;

          switch (currentToolRef.current) {
            case 'rectangle':
              DrawTools.drawRectangle(
                ctx,
                {
                  type: 'rectangle',
                  x: startPos.x,
                  y: startPos.y,
                  width,
                  height,
                  color: strokeColorRef.current,
                },
                lineWidthRef.current
              );
              break;
            case 'circle': {
              const radius = Math.sqrt(width ** 2 + height ** 2);
              DrawTools.drawCircle(
                ctx,
                {
                  type: 'circle',
                  x: startPos.x,
                  y: startPos.y,
                  radius,
                  color: strokeColorRef.current,
                },
                lineWidthRef.current
              );
              break;
            }
            case 'arrow':
              DrawTools.drawArrow(
                ctx,
                {
                  fromX: startPos.x,
                  fromY: startPos.y,
                  toX: currentPos.x,
                  toY: currentPos.y,
                  color: strokeColorRef.current,
                },
                lineWidthRef.current
              );
              break;
            case 'freehand':
              DrawTools.drawFreehand(
                ctx,
                {
                  type: 'freehand',
                  points: freehandPath,
                  color: strokeColorRef.current,
                },
                lineWidthRef.current
              );
              break;
            default:
              break;
          }
        }
        ctx.restore();
      });
    }, [drawImage]);

    useImperativeHandle(
      ref,
      () => ({
        getCanvas: () => canvasRef.current,
        getContext: () => ctxRef.current,
        redraw: drawCanvas,
      }),
      [drawCanvas]
    );

    // 初始化 Canvas 和图片
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      ctxRef.current = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = src;

      img.onload = () => {
        imageRef.current = img;
        drawCanvas();
      };
    }, [src]);

    // 监听状态变化，重新绘制
    useEffect(() => {
      drawCanvas();
    }, [annotations, drawState, currentTool, strokeColor, lineWidth, viewport]);

    return <canvas ref={canvasRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onContextMenu={onContextMenu} />;
  }
);

AnnotationCanvas.displayName = 'AnnotationCanvas';

export default AnnotationCanvas;
