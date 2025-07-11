import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ToolBar } from './ToolBar';
import { drawArrow, createArrowAnnotation, drawTemporaryArrow } from '../tools/arrow';
import { drawControlPoint, getBoundingBox } from '../tools/common';
import { drawCircle, createCircleAnnotation, drawTemporaryCircle } from '../tools/circle';
import { drawFreehand, createFreehandAnnotation, drawTemporaryFreehand } from '../tools/freehand';
import { drawRectangle, createRectangleAnnotation, drawTemporaryRectangle } from '../tools/rectangle';
import { drawText, startTextInput as startTextInputTool, finishTextInput as finishTextInputTool, handleTextChange as handleTextChangeTool } from '../tools/text';
import { isInAnnotation, throttle } from '../utils/canvasUtils';
import './ImageAnnotation.css';

// 设置canvas默认尺寸
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;
const ImageAnnotation = ({ src }) => {
  const [drawState, setDrawState] = useState({
    isDrawing: false, // 是否正在绘制标注
    isDragging: false, // 是否正在拖动标注
    startPos: { x: 0, y: 0 }, // 鼠标起始位置
    currentPos: { x: 0, y: 0 }, // 鼠标当前位置
    freehandPath: [], // 存储自由绘制路径点
    selectedId: null, // 正在操作的标注ID
  });
  const [annotations, setAnnotations] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentTool, setCurrentTool] = useState(null);
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
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const textAreaRef = useRef(null);
  const reqAniRef = useRef(null);
  const ctxRef = useRef(null);
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
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
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
      const ctx = ctxRef.current;
      if (canvas && ctx) {
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
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
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
      setDrawState({ ...drawState, selectedId: null });
      setStatus(`已回退上一步操作 (剩余 ${history.length - 1} 步历史)`);
    }
  };

  // 删除选中元素
  const deleteSelected = useCallback(() => {
    if (drawState.selectedId) {
      saveHistory();
      setAnnotations((prev) => prev.filter((a) => a.id !== drawState.selectedId));
      setDrawState({ ...drawState, selectedId: null });
      setStatus('已删除选中标注');
    }
  }, [drawState.selectedId, annotations]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;    
    canvas.width = DEFAULT_WIDTH;
    canvas.height = DEFAULT_HEIGHT;
    ctxRef.current = canvas.getContext('2d');
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
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const { startPos, currentPos, isDrawing, selectedId, freehandPath } = drawState;
    reqAniRef.current = requestAnimationFrame(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const strokeStyle = '#FF0000';
      const lineWidth = 2;

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
            drawRectangle(ctx, ann, lineWidth);
            break;
          case 'circle':
            drawCircle(ctx, ann, lineWidth);
            break;
          case 'arrow':
            drawArrow(ctx, { ...ann, fromX: ann.x, fromY: ann.y, toX: ann.x + ann.width, toY: ann.y + ann.height }, lineWidth);
            break;
          case 'text':
            drawText(ctx, ann, textInput);
            break;
          case 'freehand':
            drawFreehand(ctx, ann, lineWidth);
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
        const width = currentPos.x - startPos.x;
        const height = currentPos.y - startPos.y;
        switch (currentTool) {
          case 'rectangle':
            drawRectangle(ctx, { x: startPos.x, y: startPos.y, width, height, color: strokeStyle }, lineWidth);
            break;
          case 'circle':
            const radius = Math.sqrt(width ** 2 + height ** 2);
            drawCircle(ctx, { x: startPos.x, y: startPos.y, radius, color: strokeStyle }, lineWidth);
            break;
          case 'arrow':
            drawArrow(ctx, { fromX: startPos.x, fromY: startPos.y, toX: currentPos.x, toY: currentPos.y, color: strokeStyle }, lineWidth);
            break;
          case 'freehand':
            drawFreehand(ctx, { points: freehandPath, color: strokeStyle }, lineWidth);
            break;
          default:
            break;
        }
      }
    });
  }, [annotations, drawState, currentTool]);

  const handleMouseDown = (e) => {
    // 鼠标左键双击\鼠标右键\未选中绘制工具
    if (e.detail === 2 || e.button === 2 || !currentTool) return;

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
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

    // 检查是否点击了标注
    const clickedAnnotation = [...annotations].reverse().find((ann) => isInAnnotation(ann, x, y, ctx));
    setDrawState({
      ...drawState,
      startPos: { x, y },
      currentPos: { x, y },
      freehandPath: currentTool === 'freehand' ? [{ x, y }] : [],
      selectedId: clickedAnnotation?.id || null,
      isDragging: !!clickedAnnotation,
      isDrawing: !clickedAnnotation,
    });
    setStatus(`正在绘制 ${currentTool} (起点: ${x.toFixed(0)}, ${y.toFixed(0)})`);
  };

  const handleDoubleClick = () => {
    const clickedText = annotations.find((a) => a.type === 'text' && isInAnnotation(a, x, y, ctx));
    // 文字进行编辑
    if (clickedText) {
      startTextInput(clickedText.x, clickedText.y, clickedText.id);
      return;
    }
  };
  const handleContextMenu = () => {
    if (drawState.selectedId) {
      setDrawState({ ...drawState, selectedId: null });
    }
  };

  const handleMouseMove = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;

      const { startPos, currentPos, isDragging, isDrawing, selectedId, freehandPath } = drawState;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 检查是否在任意标注上
      const isOnAnnotation = annotations.some((ann) => isInAnnotation(ann, x, y, ctx));
      canvas.style.cursor = isOnAnnotation ? 'move' : 'crosshair';

      // 拖动
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
        setDrawState({ ...drawState, currentPos: { x, y } });
        drawCanvas();
        return;
      }

      // 绘制新标注
      if (isDrawing) {
        setDrawState({ ...drawState, freehandPath: currentTool === 'freehand' ? [...freehandPath, { x, y }] : freehandPath, currentPos: { x, y } });
        setStatus(`正在绘制 ${currentTool} (起点: ${startPos.x.toFixed(0)}, ${startPos.y.toFixed(0)}) → (终点: ${x.toFixed(0)}, ${y.toFixed(0)})`);
        drawCanvas();
      }
    },
    [drawState, currentTool, annotations]
  );

  const throttledMouseMove = useMemo(() => throttle(handleMouseMove, 50), [handleMouseMove]);
  const handleMouseUp = () => {
    const { startPos, currentPos, isDrawing, isDragging, freehandPath } = drawState;
    if ((isDrawing && isDragging) || !currentTool) return;
    if (isDragging) {
      saveHistory();
      setDrawState({ ...drawState, isDragging: false, isDrawing: false });
      setStatus('已移动选中标注');
      return;
    }
    const width = currentPos.x - startPos.x;
    const height = currentPos.y - startPos.y;
    // 只有距离足够时才添加
    if (Math.abs(width) > 3 || Math.abs(height) > 3) {
      saveHistory();
      const points = currentTool === 'freehand' ? { points: [...freehandPath] } : {};
      const radius = currentTool === 'circle' ? { radius: Math.sqrt(width ** 2 + height ** 2) } : {};
      const newAnnotation = {
        id: `${annotations.length + 1}`,
        type: currentTool,
        x: startPos.x,
        y: startPos.y,
        width,
        height,
        color: '#FF0000',
        ...points,
        ...radius,
      };
      freehandPath.length > 0 && setDrawState({ ...drawState, freehandPath: [] });
      setAnnotations((prev) => [...prev, newAnnotation]);
      setStatus(`已添加 ${currentTool} 标注 (共 ${annotations.length + 1} 个)`);
    } else {
      setStatus('绘制距离太短，已取消');
    }
    setDrawState({ selectedId: drawState.selectedId, freehandPath: [], startPos: { x: 0, y: 0 }, currentPos: { x: 0, y: 0 }, isDrawing: false, isDragging: false });
  };

  const clearCanvas = () => {
    saveHistory();
    setAnnotations([]);
    setDrawState({ ...drawState, selectedId: null });
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
    const { selectedId, isDragging, isDrawing } = drawState;
    if (!isDragging || !isDrawing) {
      drawCanvas();
    }
    // 设置选中状态下的鼠标样式
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = selectedId ? 'move' : 'crosshair';
    }
  }, [annotations, drawState.isDragging, drawState.isDrawing, drawState.selectedId]);

  useEffect(() => {
    if (drawState.selectedId && currentTool !== 'freehand') {
      setDrawState({ ...drawState, selectedId: null });
    }
    if (textInput.show) {
      finishTextInput();
    }
  }, [currentTool]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete') {
        deleteSelected();
      } else if (e.ctrlKey && e.key === 'z') {
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      reqAniRef.current && cancelAnimationFrame(reqAniRef.current);
    };
  }, [deleteSelected, undo]);

  return (
    <div>
      <ToolBar currentTool={currentTool} onSelectTool={setCurrentTool} onClear={clearCanvas} onUndo={undo} onDownload={download} historyLength={history.length} />
      <div className="image-container">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={throttledMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
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
