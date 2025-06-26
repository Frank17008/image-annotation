export const drawFreehand = (ctx, annotation) => {
  if (annotation.points.length < 2) return;
  ctx.strokeStyle = annotation.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
  for (let i = 1; i < annotation.points.length; i++) {
    ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
  }
  ctx.stroke();
};

// 创建自由绘制标注
export const createFreehandAnnotation = (path) => {
  return {
    id: Date.now().toString(),
    type: 'freehand',
    points: [...path],
    color: '#FF0000',
  };
};

// 绘制临时自由绘制路径（拖拽过程中）
export const drawTemporaryFreehand = (ctx, path) => {
  if (path.length < 2) return;
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();
};