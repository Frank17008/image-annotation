import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { drawArrow, createArrowAnnotation, drawTemporaryArrow } from '../tools/arrow';
import { drawControlPoint, getBoundingBox } from '../tools/common';
import { drawCircle, createCircleAnnotation, drawTemporaryCircle } from '../tools/circle';
import { drawFreehand, createFreehandAnnotation, drawTemporaryFreehand } from '../tools/freehand';
import { drawRectangle, createRectangleAnnotation, drawTemporaryRectangle } from '../tools/rectangle';
import { drawText, startTextInput as startTextInputTool, finishTextInput as finishTextInputTool, handleTextChange as handleTextChangeTool } from '../tools/text';
import { isInAnnotation, isInControlPoint } from '../utils/canvasUtils';
import './ImageAnnotation.css';

// 设置canvas默认尺寸
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;
const ImageAnnotation = ({ src }) => {
  const [annotations, setAnnotations] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentTool, setCurrentTool] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [freehandPath, setFreehandPath] = useState([]); // 存储自由绘制路径点
  const [textInput, setTextInput] = useState({
    show: false,
    x: 0,
    y: 0,
    width: 200, // 默认文本框宽度
    height: 24, // 默认文本框高度
    text: '',
    editId: null, // 正在编辑的标注ID
  });
  const [status, setStatus] = useState('请选择工具开始标注');
  const [selectedId, setSelectedId] = useState(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const textAreaRef = useRef(null);

  const textAreaTop = useMemo(() => {
    return textInput.y - textInput.height / 2 <= 10 ? 10 : textInput.y - textInput.height / 2;
  }, [textInput]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'annotated_image.png';
    a.click();
    a.remove();
  };

  // 开始文字输入
  const startTextInput = (x, y, editId = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
    setTextInput({
      show: true,
      x,
      y,
      width,
      height,
      text,
      editId,
    });
  };
  // 完成文字输入
  const finishTextInput = () => {
    const text = textInput.text.trim();
    if (!text) {
      setTextInput({ ...textInput, show: false });
      return;
    }

    if (textInput.editId) {
      // 编辑现有文字
      setAnnotations((prev) =>
        prev.map((ann) =>
          ann.id === textInput.editId
            ? {
                ...ann,
                text,
                // 保持原始位置不变
                x: ann.x,
                y: ann.y,
              }
            : ann
        )
      );
    } else {
      // 添加新文字
      saveHistory();
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.font = '16px Arial';
        // 确保文字位置在合理范围内
        const x = Math.max(0, Math.min(textInput.x, canvas.width - 200));
        const y = Math.max(16, Math.min(textInput.y, canvas.height - 10));

        setAnnotations((prev) => [
          ...prev,
          {
            id: `${prev.length + 1}`,
            type: 'text',
            x,
            y,
            text,
            color: '#FF0000',
          },
        ]);
      }
    }
    setTextInput({ ...textInput, show: false });
  };

  const handleTextChange = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
    const lineMetrics = lines.map((line) => {
      const metrics = ctx.measureText(line);
      const lineWidth = Math.min(metrics.width, maxWidth);
      maxLineWidth = Math.max(maxLineWidth, lineWidth);
      totalHeight += 20; // 行高固定为20px
      return {
        line,
        width: lineWidth,
      };
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

    setTextInput({
      ...textInput,
      text: finalText,
      width: taWidth,
      height: taHeight,
    });
  };

  // 保存历史记录
  const saveHistory = () => {
    setHistory((prev) => [...prev, [...annotations]]);
  };

  // 回退上一步
  const undo = () => {
    if (history.length > 0) {
      const lastState = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setAnnotations(lastState);
      setSelectedId(null);
      setStatus(`已回退上一步操作 (剩余 ${history.length - 1} 步历史)`);
    }
  };

  // 删除选中元素
  const deleteSelected = () => {
    if (selectedId) {
      saveHistory();
      setAnnotations((prev) => prev.filter((a) => a.id !== selectedId));
      setSelectedId(null);
      setStatus('已删除选中标注');
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = DEFAULT_WIDTH;
    canvas.height = DEFAULT_HEIGHT;
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // 处理跨域问题
    img.src = src;
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };

    const resizeCanvas = () => {
      // 只需要调整CSS显示尺寸，保持原始画布尺寸不变
      const container = canvas.parentElement;
      if (container) {
        const ratio = img.width / img.height;
        const maxWidth = container.clientWidth;
        canvas.style.width = `${Math.min(maxWidth, img.width)}px`;
        canvas.style.height = `${Math.min(maxWidth / ratio, img.height)}px`;
      }
    };

    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [src]);

  // 绘制画布
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制图片
    if (imageRef.current) {
      // 计算等比例缩放尺寸
      const ratio = Math.min(DEFAULT_WIDTH / imageRef.current.naturalWidth, DEFAULT_HEIGHT / imageRef.current.naturalHeight);
      const displayWidth = imageRef.current.naturalWidth * ratio;
      const displayHeight = imageRef.current.naturalHeight * ratio;

      // 居中绘制图片
      const offsetX = (DEFAULT_WIDTH - displayWidth) / 2;
      const offsetY = (DEFAULT_HEIGHT - displayHeight) / 2;

      ctx.drawImage(imageRef.current, offsetX, offsetY, displayWidth, displayHeight);

      // 保存缩放和偏移信息用于坐标转换
      canvas.dataset.scale = ratio;
      canvas.dataset.offsetX = offsetX;
      canvas.dataset.offsetY = offsetY;
    }

    // 绘制已有标注
    annotations.forEach((ann) => {
      switch (ann.type) {
        case 'rectangle':
          drawRectangle(ctx, ann, 2);
          break;
        case 'circle':
          drawCircle(ctx, ann, 2);
          break;
        case 'arrow':
          drawArrow(ctx, ann.x, ann.y, ann.x + ann.width, ann.y + ann.height, ann.color);
          break;
        case 'text':
          drawText(ctx, ann, textInput);
          break;
        case 'freehand':
          drawFreehand(ctx, ann, 2);
          break;
        default:
          break;
      }

      // 绘制选中状态, 自由绘制和文字除外
      if (ann.id === selectedId && ann.type !== 'freehand' && ann.type !== 'text') {
        const boundingBox = getBoundingBox(ann, ctx);

        if (ann.type === 'arrow') {
          // 只绘制两端控制点
          drawControlPoint(ctx, ann.x, ann.y);
          drawControlPoint(ctx, ann.x + ann.width, ann.y + ann.height);
        } else {
          // 其他类型绘制外接框和控制点
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = '#1890ff';
          ctx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
          ctx.setLineDash([]);

          // 绘制控制点
          drawControlPoint(ctx, boundingBox.x, boundingBox.y);
          drawControlPoint(ctx, boundingBox.x + boundingBox.width, boundingBox.y);
          drawControlPoint(ctx, boundingBox.x + boundingBox.width, boundingBox.y + boundingBox.height);
          drawControlPoint(ctx, boundingBox.x, boundingBox.y + boundingBox.height);
        }
      }
    });

    // 绘制当前激活的新标注
    if (isDrawing && currentTool) {
      const strokeStyle = '#FF0000';
      const lineWidth = 2;
      const width = currentPos.x - startPos.x;
      const height = currentPos.y - startPos.y;
      switch (currentTool) {
        case 'rectangle':
          drawRectangle(ctx, { x: startPos.x, y: startPos.y, width, height }, lineWidth);
          break;
        case 'circle':
          const radius = Math.sqrt(width * width + height * height);
          drawCircle(ctx, { color: strokeStyle, x: startPos.x, y: startPos.y, radius }, lineWidth);
          break;
        case 'arrow':
          drawArrow(ctx, startPos.x, startPos.y, currentPos.x, currentPos.y, strokeStyle);
          break;
        case 'freehand':
          drawFreehand(ctx, { points: freehandPath, color: strokeStyle }, lineWidth);
          break;
        default:
          break;
      }
    }
  };

  const handleMouseDown = (e) => {
    // 鼠标左键双击或鼠标右键
    if (e.detail === 2 || e.button === 2) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');

    // 如果正在输入文字，点击外部完成输入
    if (textInput.show) {
      if (!textInput.text) {
        startTextInput(x, y);
      } else {
        finishTextInput();
      }
      return;
    }
    // 处理文字工具
    if (currentTool === 'text') {
      startTextInput(x, y);
      return;
    }

    // 检查是否点击了自由绘制线条（优先于其他检查）
    const clickedFreehand = [...annotations].reverse().find((ann) => ann.type === 'freehand' && isInAnnotation(ann, x, y, ctx));
    if (clickedFreehand) {
      setIsDragging(true);
      setSelectedId(clickedFreehand.id);
      setStartPos({ x, y });
      setCurrentPos({ x, y });
      return;
    }

    // 检查是否点击了已有标注
    if (selectedId) {
      const selectedAnn = annotations.find((a) => a.id === selectedId);
      if (selectedAnn) {
        // 先检查控制点
        if (isInControlPoint(selectedAnn, x, y, ctx)) {
          setIsDrawing(true);
          setStartPos({ x, y });
          setCurrentPos({ x, y });
          return;
        }

        // 再检查是否在标注本身上
        if (isInAnnotation(selectedAnn, x, y, ctx)) {
          setIsDragging(true);
          setStartPos({ x, y });
          setCurrentPos({ x, y });
          return;
        }
      } else {
        setSelectedId(null);
      }
    }

    // 检查是否点击了其他标注（非当前选中标注）
    const clickedAnnotation = [...annotations].reverse().find((ann) => ann.id !== selectedId && isInAnnotation(ann, x, y, ctx));

    if (clickedAnnotation) {
      setSelectedId(clickedAnnotation.id);
      return;
    }

    // 只有点击空白处且没有选中任何内容时，才启用绘制功能
    if (!currentTool) return;

    if (currentTool === 'freehand') {
      setFreehandPath([{ x, y }]);
    }
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
    setStatus(`正在绘制 ${currentTool} (起点: ${x.toFixed(0)}, ${y.toFixed(0)})`);
  };

  const handleDoucbleClick = () => {
    const clickedText = annotations.find((a) => a.type === 'text' && isInAnnotation(a, x, y, ctx));
    // 文字进行编辑
    if (clickedText) {
      startTextInput(clickedText.x, clickedText.y, clickedText.id);
      return;
    }
  };
  const handleContextMenu = () => {
    if(selectedId) {
      setSelectedId(null);
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');

    // 检查是否在任意标注上
    const isOnAnnotation = annotations.some((ann) => isInAnnotation(ann, x, y, ctx));
    canvas.style.cursor = isOnAnnotation ? 'move' : 'crosshair';

    // 拖动整个标注
    if (isDragging && selectedId) {
      const dx = x - currentPos.x;
      const dy = y - currentPos.y;

      setAnnotations((prev) =>
        prev.map((ann) => {
          if (ann.id === selectedId) {
            if (ann.type === 'freehand') {
              return {
                ...ann,
                points: ann.points.map((point) => ({
                  x: point.x + dx,
                  y: point.y + dy,
                })),
              };
            } else {
              return { ...ann, x: ann.x + dx, y: ann.y + dy };
            }
          }
          return ann;
        })
      );

      setCurrentPos({ x, y });
      drawCanvas();
      return;
    }

    // 自由绘制处理
    if (isDrawing && currentTool === 'freehand') {
      setFreehandPath((prev) => [...prev, { x, y }]);
      drawCanvas();
      return;
    }

    // 绘制新标注或调整控制点
    if (isDrawing) {
      setCurrentPos({ x, y });
      setStatus(`正在绘制 ${currentTool} (起点: ${startPos.x.toFixed(0)}, ${startPos.y.toFixed(0)}) → (终点: ${x.toFixed(0)}, ${y.toFixed(0)})`);
      drawCanvas();
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing && !isDragging) return;
    // 自由绘制的结束处理
    if (currentTool === 'freehand' && freehandPath.length > 1) {
      saveHistory();
      setAnnotations((prev) => [
        ...prev,
        {
          id: `${prev.length + 1}`,
          type: 'freehand',
          points: [...freehandPath],
          color: '#FF0000',
        },
      ]);
      setFreehandPath([]);
      setStatus(`已添加自由绘制线条 (共 ${annotations.length + 1} 个)`);
    }
    setIsDrawing(false);
    setIsDragging(false);
    if (isDragging) {
      saveHistory();
      setStatus('已移动选中标注');
      return;
    }

    if (!currentTool) return;

    const width = currentPos.x - startPos.x;
    const height = currentPos.y - startPos.y;

    // 只有距离足够时才添加
    if (Math.abs(width) > 5 || Math.abs(height) > 5) {
      saveHistory();
      const newAnnotation = {
        id: `${annotations.length + 1}`,
        type: currentTool,
        x: startPos.x,
        y: startPos.y,
        width,
        height,
        radius: currentTool === 'circle' ? Math.sqrt(width * width + height * height) : undefined,
        color: '#FF0000',
      };

      setAnnotations((prev) => [...prev, newAnnotation]);
      setStatus(`已添加 ${currentTool} 标注 (共 ${annotations.length + 1} 个)`);
    } else {
      setStatus('绘制距离太短，已取消');
    }
  };

  const clearCanvas = () => {
    saveHistory();
    setAnnotations([]);
    setSelectedId(null);
    setStatus('已清除所有标注');
  };
  // textarea auto focus
  useEffect(() => {
    if (textInput.show && textAreaRef.current) {
      textAreaRef.current.focus();
      const len = textAreaRef.current.value.length;
      textAreaRef.current.setSelectionRange(len, len);
    }
  }, [textInput.show, textInput.x]);

  useEffect(() => {
    if (!isDragging || !isDrawing) {
      drawCanvas();
    }
    // 设置选中状态下的鼠标样式
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = selectedId ? 'move' : 'crosshair';
    }
  }, [annotations, selectedId, isDragging, isDrawing]);

  useEffect(() => {
    if (selectedId && currentTool !== 'freehand') {
      setSelectedId(null);
    }
    if (textInput.show) {
      finishTextInput();
    }
  }, [currentTool]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' && selectedId) {
        deleteSelected();
      } else if (e.ctrlKey && e.key === 'z') {
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, deleteSelected, undo]);

  return (
    <div>
      <div className="toolbar">
        <button className={currentTool === 'rectangle' ? 'active' : ''} onClick={() => setCurrentTool('rectangle')}>
          矩形
        </button>
        <button className={currentTool === 'circle' ? 'active' : ''} onClick={() => setCurrentTool('circle')}>
          圆形
        </button>
        <button className={currentTool === 'arrow' ? 'active' : ''} onClick={() => setCurrentTool('arrow')}>
          箭头
        </button>
        <button className={currentTool === 'text' ? 'active' : ''} onClick={() => setCurrentTool('text')}>
          文字
        </button>
        <button className={currentTool === 'freehand' ? 'active' : ''} onClick={() => setCurrentTool('freehand')}>
          自由线条
        </button>
        <button
          onClick={clearCanvas}
          style={{
            marginLeft: '20px',
            background: '#ff4d4f',
            color: 'white',
          }}
        >
          清除所有
        </button>
        <button onClick={undo} disabled={history.length === 0} style={{ marginLeft: '10px' }}>
          撤销 (Ctrl+Z)
        </button>
        <button onClick={download} style={{ marginLeft: '10px' }}>
          导出
        </button>
      </div>

      <div className="image-container">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoucbleClick}
          onContextMenu={handleContextMenu}
        />
        {textInput.show && (
          <textarea
            ref={textAreaRef}
            className="text-input"
            style={{
              left: textInput.x,
              top: textAreaTop,
              width: textInput.width,
              height: textInput.height,
            }}
            value={textInput.text}
            onChange={handleTextChange}
          />
        )}
      </div>
      <div className="status">{status}</div>
      <div>
        <h3>当前标注 ({annotations.length}个):</h3>
        <pre>{JSON.stringify(annotations, null, 2)}</pre>
      </div>
    </div>
  );
};

export default ImageAnnotation;
