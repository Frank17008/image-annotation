import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { drawArrowAnnotation, createArrowAnnotation, drawTemporaryArrow } from '../tools/arrow';
import { drawCircle, createCircleAnnotation, drawTemporaryCircle } from '../tools/circle';
import { drawFreehand, createFreehandAnnotation, drawTemporaryFreehand } from '../tools/freehand';
import { drawRectangle, createRectangleAnnotation, drawTemporaryRectangle } from '../tools/rectangle';
import { drawText, startTextInput as startTextInputTool, finishTextInput as finishTextInputTool, handleTextChange as handleTextChangeTool } from '../tools/text';
import { getBoundingBox, isInAnnotation, isInControlPoint, drawControlPoint } from '../utils/canvasUtils';
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
  const animationFrameRef = useRef(null);

  // 优化文本框位置计算
  const textAreaTop = useMemo(() => {
    return textInput.y - textInput.height / 2 <= 10 ? 10 : textInput.y - textInput.height / 2;
  }, [textInput]);

  // 下载标注图片
  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'annotated_image.png';
    a.click();
    a.remove();
  }, []);

  // 开始文字输入
  const startTextInput = useCallback(
    (x, y, editId = null) => {
      setTextInput(startTextInputTool(x, y, editId, annotations));
      // 延迟聚焦文本框
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.focus();
        }
      }, 0);
    },
    [annotations]
  );
  // 保存历史记录
  const saveHistory = useCallback(() => {
    setHistory((prev) => [...prev, [...annotations]]);
  }, [annotations]);
  // 完成文字输入
  const finishTextInput = useCallback(() => {
    const newTextInput = finishTextInputTool(textInput, annotations, setAnnotations, saveHistory);
    setTextInput(newTextInput);
  }, [textInput, annotations, saveHistory]);

  // 处理文字输入变化
  const handleTextChange = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const newTextInput = handleTextChangeTool(e, textInput, canvas);
      setTextInput(newTextInput);
    },
    [textInput]
  );

  // 回退上一步
  const undo = useCallback(() => {
    if (history.length > 0) {
      const lastState = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setAnnotations(lastState);
      setSelectedId(null);
      setStatus(`已回退上一步操作 (剩余 ${history.length - 1} 步历史)`);
    }
  }, [history]);

  // 删除选中元素
  const deleteSelected = useCallback(() => {
    if (selectedId) {
      saveHistory();
      setAnnotations((prev) => prev.filter((a) => a.id !== selectedId));
      setSelectedId(null);
      setStatus('已删除选中标注');
    }
  }, [selectedId, saveHistory]);

  // 坐标转换 - 将鼠标坐标转换为画布坐标
  const getCanvasCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  // 绘制画布 - 使用requestAnimationFrame优化渲染性能
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除画布
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

    // 绘制自由绘制路径（临时）
    if (isDrawing && currentTool === 'freehand' && freehandPath.length > 1) {
      drawTemporaryFreehand(ctx, freehandPath);
    }

    // 绘制已有标注
    annotations.forEach((ann) => {
      switch (ann.type) {
        case 'rectangle':
          drawRectangle(ctx, ann);
          break;
        case 'circle':
          drawCircle(ctx, ann);
          break;
        case 'arrow':
          drawArrowAnnotation(ctx, ann);
          break;
        case 'text':
          drawText(ctx, ann, textInput);
          break;
        case 'freehand':
          drawFreehand(ctx, ann);
          break;
        default:
          break;
      }

      // 绘制选中状态
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

    // 绘制当前标注（临时）
    if (isDrawing && currentTool && currentTool !== 'freehand' && currentTool !== 'text') {
      const width = currentPos.x - startPos.x;
      const height = currentPos.y - startPos.y;

      switch (currentTool) {
        case 'rectangle':
          drawTemporaryRectangle(ctx, startPos, currentPos);
          break;
        case 'circle':
          drawTemporaryCircle(ctx, startPos, currentPos);
          break;
        case 'arrow':
          drawTemporaryArrow(ctx, startPos, currentPos);
          break;
        default:
          break;
      }
    }
  }, [isDrawing, currentTool, startPos, currentPos, freehandPath, annotations, textInput, selectedId]);

  // 使用requestAnimationFrame优化渲染
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(drawCanvas);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [drawCanvas]);

  // 初始化画布和图片加载
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
  }, [src, drawCanvas]);

  // 鼠标按下事件处理
  const handleMouseDown = useCallback(
    (e) => {
      if (textInput.show) return;
      const pos = getCanvasCoordinates(e);

      // 检查是否点击在现有标注上
      const clickedAnnotation = annotations.find((ann) => isInAnnotation(ann, pos.x, pos.y, canvasRef.current?.getContext('2d')));

      if (clickedAnnotation) {
        setSelectedId(clickedAnnotation.id);
        setIsDragging(true);
        setStartPos(pos);
        return;
      }

      // 如果没有选择工具，不执行绘制
      if (!currentTool) return;

      setIsDrawing(true);
      setStartPos(pos);
      setCurrentPos(pos);

      if (currentTool === 'freehand') {
        setFreehandPath([pos]);
      } else if (currentTool === 'text') {
        startTextInput(pos.x, pos.y);
        setIsDrawing(false);
      }
    },
    [currentTool, getCanvasCoordinates, annotations, textInput.show, startTextInput]
  );

  // 鼠标移动事件处理
  const handleMouseMove = useCallback(
    (e) => {
      if (!isDrawing && !isDragging) return;
      const pos = getCanvasCoordinates(e);
      setCurrentPos(pos);

      if (isDrawing && currentTool === 'freehand') {
        setFreehandPath((prev) => [...prev, pos]);
      }
    },
    [isDrawing, isDragging, currentTool, getCanvasCoordinates]
  );

  // 鼠标释放事件处理
  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentTool && currentTool !== 'text') {
      saveHistory();
      let newAnnotation;

      switch (currentTool) {
        case 'rectangle':
          newAnnotation = createRectangleAnnotation(startPos, currentPos);
          break;
        case 'circle':
          newAnnotation = createCircleAnnotation(startPos, currentPos);
          break;
        case 'arrow':
          newAnnotation = createArrowAnnotation(startPos, currentPos);
          break;
        case 'freehand':
          newAnnotation = createFreehandAnnotation(freehandPath);
          break;
        default:
          return;
      }

      if (newAnnotation) {
        setAnnotations((prev) => [...prev, newAnnotation]);
        setStatus(`已添加${currentTool === 'arrow' ? '箭头' : currentTool === 'freehand' ? '自由绘制' : currentTool}标注`);
      }

      // 重置临时状态
      setFreehandPath([]);
    }

    setIsDrawing(false);
    setIsDragging(false);
  }, [isDrawing, currentTool, startPos, currentPos, freehandPath, saveHistory]);

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
    <div className="annotation-container">
      <div className="toolbar">
        <button onClick={() => setCurrentTool('rectangle')} className={currentTool === 'rectangle' ? 'active' : ''}>
          矩形
        </button>
        <button onClick={() => setCurrentTool('circle')} className={currentTool === 'circle' ? 'active' : ''}>
          圆形
        </button>
        <button onClick={() => setCurrentTool('arrow')} className={currentTool === 'arrow' ? 'active' : ''}>
          箭头
        </button>
        <button onClick={() => setCurrentTool('freehand')} className={currentTool === 'freehand' ? 'active' : ''}>
          自由绘制
        </button>
        <button onClick={() => setCurrentTool('text')} className={currentTool === 'text' ? 'active' : ''}>
          文字
        </button>
        <button onClick={undo} disabled={history.length === 0}>
          撤销
        </button>
        <button className='delete-btn' onClick={deleteSelected} disabled={!selectedId}>
          删除
        </button>
        <button onClick={download}>下载</button>
        <span className="status">{status}</span>
      </div>
      <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} className="annotation-canvas" />
      {textInput.show && (
        <div
          className="text-input-overlay"
          style={{
            left: `${textInput.x}px`,
            top: `${textAreaTop}px`,
            width: `${textInput.width}px`,
            height: `${textInput.height}px`,
          }}
        >
          <textarea
            ref={textAreaRef}
            value={textInput.text}
            onChange={handleTextChange}
            onBlur={finishTextInput}
            onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && finishTextInput()}
            className="text-input"
            style={{
              width: '100%',
              height: '100%',
              resize: 'none',
              border: '1px solid #FF0000',
              padding: '5px',
              fontSize: '16px',
              boxSizing: 'border-box',
            }}
            autoFocus
          />
        </div>
      )}
    </div>
  );
};

export default ImageAnnotation;
