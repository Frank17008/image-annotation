export const drawText = (ctx, annotation, textInput) => {
  if (textInput.show && textInput.editId === annotation.id) return;
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

// 创建文字标注
export const createTextAnnotation = (x, y, text) => {
  return {
    id: Date.now().toString(),
    type: 'text',
    x,
    y,
    text,
    color: '#FF0000',
  };
};

// 开始文字输入
export const startTextInput = (x, y, editId = null, annotations) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = '16px Arial';

  let text = '';
  let width = 200;
  let height = 24;

  if (editId) {
    const annotation = annotations.find((a) => a.id === editId);
    if (annotation) {
      text = annotation.text;
      // 计算多行文本的尺寸
      const lines = text.split('\n');
      height = Math.max(24, lines.length * 20);
      width = Math.max(...lines.map((line) => ctx.measureText(line).width)) + 10;
    }
  }
  return {
    show: true,
    x,
    y,
    width,
    height,
    text,
    editId,
  };
};

// 完成文字输入
export const finishTextInput = (textInput, annotations, setAnnotations, saveHistory, canvas) => {
  const text = textInput.text.trim();
  if (!text) {
    return { ...textInput, show: false };
  }

  if (textInput.editId) {
    // 编辑现有文字
    setAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === textInput.editId
          ? { ...ann, text, x: ann.x, y: ann.y }
          : ann
      )
    );
  } else {
    // 添加新文字
    saveHistory();
    // 确保文字位置在合理范围内
    const x = Math.max(0, Math.min(textInput.x, canvas.width - 200));
    const y = Math.max(16, Math.min(textInput.y, canvas.height - 10));

    setAnnotations((prev) => [...prev, createTextAnnotation(x, y, text)]);
  }
  return { ...textInput, show: false };
};

// 处理文字输入变化
export const handleTextChange = (e, textInput, canvas) => {
  const ctx = canvas.getContext('2d');
  ctx.font = '16px Arial';

  // 计算最大可用尺寸（考虑canvas边界）
  const maxWidth = Math.max(10, canvas.width - textInput.x - 10); // 保留10px边距
  const maxHeight = Math.max(24, canvas.height - textInput.y - 10); // 最小高度24px

  const input = e.target.value;
  const lines = input.split('\n');

  // 计算每行宽度和总高度
  let totalHeight = 0;
  let maxLineWidth = 0;
  lines.forEach((line) => {
    const metrics = ctx.measureText(line);
    const lineWidth = Math.min(metrics.width, maxWidth);
    maxLineWidth = Math.max(maxLineWidth, lineWidth);
    totalHeight += 20; // 行高固定为20px
  });

  // 计算最终文本区域尺寸
  const taWidth = maxLineWidth + 10; // 加10px边距
  const taHeight = Math.min(totalHeight, maxHeight);

  // 如果达到高度限制，截断文本
  let finalText = input;
  if (totalHeight > maxHeight) {
    const maxLines = Math.floor(maxHeight / 20);
    finalText = lines.slice(0, maxLines).join('\n');
  }

  return {
    ...textInput,
    text: finalText,
    width: taWidth,
    height: taHeight,
  };
};