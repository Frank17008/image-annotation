import { drawArrow } from '../utils/canvasUtils';

// 绘制箭头标注
export const drawArrowAnnotation = (ctx, annotation) => {
  drawArrow(
    ctx,
    annotation.x,
    annotation.y,
    annotation.x + annotation.width,
    annotation.y + annotation.height,
    annotation.color
  );
};

// 创建箭头标注
export const createArrowAnnotation = (startPos, currentPos) => {
  return {
    id: Date.now().toString(),
    type: 'arrow',
    x: startPos.x,
    y: startPos.y,
    width: currentPos.x - startPos.x,
    height: currentPos.y - startPos.y,
    color: '#FF0000',
  };
};

// 绘制临时箭头（拖拽过程中）
export const drawTemporaryArrow = (ctx, startPos, currentPos) => {
  if (Math.abs(currentPos.x - startPos.x) > 5 || Math.abs(currentPos.y - startPos.y) > 5) {
    drawArrow(ctx, startPos.x, startPos.y, currentPos.x, currentPos.y, '#FF0000');
  }
};