
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

// 检测点击是否在控制点上
export const isInControlPoint = (ann, x, y, ctx) => {
  if (ann.type === 'freehand') return false;
  const boundingBox = getBoundingBox(ann, ctx);
  return (
    (Math.abs(x - boundingBox.x) < 6 && Math.abs(y - boundingBox.y) < 6) ||
    (Math.abs(x - (boundingBox.x + boundingBox.width)) < 6 && Math.abs(y - boundingBox.y) < 6) ||
    (Math.abs(x - (boundingBox.x + boundingBox.width)) < 6 && Math.abs(y - (boundingBox.y + boundingBox.height)) < 6) ||
    (Math.abs(x - boundingBox.x) < 6 && Math.abs(y - (boundingBox.y + boundingBox.height)) < 6)
  );
};

// 检测点是否在线段附近
export const isPointNearLine = (x, y, x1, y1, x2, y2, threshold = 6) => {
  // 计算点到线段的最短距离
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) param = dot / len_sq;
  let xx, yy;
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

// 检测点击是否在标注上
export const isInAnnotation = (ann, x, y, ctx) => {
  if (ann.type === 'rectangle') {
    // 判断点是否在矩形边框上
    const lineWidth = 2; // 匹配绘制时的线宽
    return (
      (Math.abs(x - ann.x) <= lineWidth && y >= ann.y && y <= ann.y + ann.height) || // 左边线
      (Math.abs(x - (ann.x + ann.width)) <= lineWidth && y >= ann.y && y <= ann.y + ann.height) || // 右边线
      (Math.abs(y - ann.y) <= lineWidth && x >= ann.x && x <= ann.x + ann.width) || // 上边线
      (Math.abs(y - (ann.y + ann.height)) <= lineWidth && x >= ann.x && x <= ann.x + ann.width) // 下边线
    );
  } else if (ann.type === 'circle') {
    // 判断点是否在圆周上（考虑线宽）
    const distance = Math.sqrt((x - ann.x) ** 2 + (y - ann.y) ** 2);
    return Math.abs(distance - ann.radius) <= 2; // 2px误差范围
  } else if (ann.type === 'arrow') {
    // 使用原有的线段判断方法
    return isPointNearLine(x, y, ann.x, ann.y, ann.x + ann.width, ann.y + ann.height);
  } else if (ann.type === 'text') {
    // 文字保持原有判断方式
    const boundingBox = getBoundingBox(ann, ctx);
    return x >= boundingBox.x && x <= boundingBox.x + boundingBox.width && y >= boundingBox.y && y <= boundingBox.y + boundingBox.height;
  } else if (ann.type === 'freehand') {
    // 自由绘制路径检测
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
