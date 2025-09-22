// 绘制箭头标注
export const drawArrow = (ctx, annotation, lineWidth) => {
  const { fromX, fromY, toX, toY, color } = annotation;
  if (Math.abs(toX - fromX) < 5 && Math.abs(toY - fromY) < 5) return;
  const headLength = 15;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  // 箭杆
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // 箭头
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
};

// 绘制圆形
export const drawCircle = (ctx, annotation, lineWidth) => {
  ctx.strokeStyle = annotation.color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(annotation.x, annotation.y, annotation.radius, 0, Math.PI * 2);
  ctx.stroke();
};

export const drawFreehand = (ctx, annotation, lineWidth) => {
  ctx.strokeStyle = annotation.color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
  for (let i = 1; i < annotation.points.length; i++) {
    ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
  }
  ctx.stroke();
};

export const drawRectangle = (ctx, annotation, lineWidth) => {
  ctx.strokeStyle = annotation.color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
};

export const drawText = (ctx, annotation) => {
  ctx.fillStyle = annotation.color;
  ctx.font = '16px Arial';
  // 处理多行文字渲染
  const lines = annotation.text.split('\n');
  let yPos = annotation.y;
  lines.forEach((line) => {
    ctx.fillText(line, annotation.x, yPos);
    yPos += 20; // 行间距
  });
};
