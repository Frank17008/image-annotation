// 绘制圆形
export const drawCircle = (ctx, annotation, lineWidth) => {
  ctx.strokeStyle = annotation.color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(annotation.x, annotation.y, annotation.radius, 0, Math.PI * 2);
  ctx.stroke();
};

// 创建圆形标注
export const createCircleAnnotation = (startPos, currentPos) => {
  const radius = Math.sqrt(
    Math.pow(currentPos.x - startPos.x, 2) + Math.pow(currentPos.y - startPos.y, 2)
  );
  return {
    id: Date.now().toString(),
    type: 'circle',
    x: startPos.x,
    y: startPos.y,
    radius,
    color: '#FF0000',
  };
};

// 绘制临时圆形（拖拽过程中）
export const drawTemporaryCircle = (ctx, startPos, currentPos) => {
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 2;
  const radius = Math.sqrt(
    Math.pow(currentPos.x - startPos.x, 2) + Math.pow(currentPos.y - startPos.y, 2)
  );
  ctx.beginPath();
  ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
  ctx.stroke();
};