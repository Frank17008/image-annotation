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
