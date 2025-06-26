export const drawRectangle = (ctx, annotation) => {
  ctx.strokeStyle = annotation.color;
  ctx.lineWidth = 2;
  ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
};

// 创建矩形标注
export const createRectangleAnnotation = (startPos, currentPos) => {
  return {
    id: Date.now().toString(),
    type: 'rectangle',
    x: Math.min(startPos.x, currentPos.x),
    y: Math.min(startPos.y, currentPos.y),
    width: Math.abs(currentPos.x - startPos.x),
    height: Math.abs(currentPos.y - startPos.y),
    color: '#FF0000',
  };
};

// 绘制临时矩形（拖拽过程中）
export const drawTemporaryRectangle = (ctx, startPos, currentPos) => {
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 2;
  const width = currentPos.x - startPos.x;
  const height = currentPos.y - startPos.y;
  ctx.strokeRect(startPos.x, startPos.y, width, height);
};