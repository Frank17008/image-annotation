// 绘制控制点
export const drawControlPoint = (ctx, x, y, color1 = '#FF0000', color2 = '#FFFFFF') => {
  ctx.fillStyle = color2;
  ctx.strokeStyle = color1;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
};

// 获取标注的外接矩形
export const getBoundingBox = (ann, ctx) => {
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
    // 计算箭头的外接矩形
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
    ctx.font = '16px Arial';
    const lines = ann.text.split('\n');
    const lineHeight = 20; // 行高
    const totalHeight = lines.length * lineHeight;

    // 计算最长行的宽度
    let maxWidth = 0;
    lines.forEach((line) => {
      const metrics = ctx.measureText(line);
      maxWidth = Math.max(maxWidth, metrics.width);
    });
    return {
      x: ann.x,
      y: ann.y - lineHeight,
      width: maxWidth,
      height: totalHeight,
    };
  }
  return { x: 0, y: 0, width: 0, height: 0 };
};
