import React from 'react';
import './ToolBar.css';
import { ToolType } from '../types/annotations';

interface ToolBarProps {
  currentTool: string | null;
  onSelectTool: (tool: ToolType) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  historyLength: number;
  redoHistoryLength: number;
  strokeColor: string;
  lineWidth: number;
  onColorChange: (color: string) => void;
  onLineWidthChange: (width: number) => void;
}

const ToolBar: React.FC<ToolBarProps> = (props: ToolBarProps) => {
  const { currentTool, onSelectTool, onClear, onUndo, onRedo, onExport, historyLength, redoHistoryLength, strokeColor, lineWidth, onColorChange, onLineWidthChange } = props;
  return (
    <div className="toolbar">
      <div className="brush-controls">
        <label htmlFor="color-picker">颜色:</label>
        <input id="color-picker" type="color" value={strokeColor} onChange={(e) => onColorChange(e.target.value)} style={{ marginRight: '10px' }} />
        <label htmlFor="line-width">线宽:</label>
        <input id="line-width" type="range" min="1" max="10" value={lineWidth} onChange={(e) => onLineWidthChange(Number(e.target.value))} />
        <span>{lineWidth}px</span>
      </div>
      <button className={currentTool === 'rectangle' ? 'active' : ''} onClick={() => onSelectTool('rectangle')}>
        矩形
      </button>
      <button className={currentTool === 'circle' ? 'active' : ''} onClick={() => onSelectTool('circle')}>
        圆形
      </button>
      <button className={currentTool === 'arrow' ? 'active' : ''} onClick={() => onSelectTool('arrow')}>
        箭头
      </button>
      <button className={currentTool === 'text' ? 'active' : ''} onClick={() => onSelectTool('text')}>
        文字
      </button>
      <button className={currentTool === 'freehand' ? 'active' : ''} onClick={() => onSelectTool('freehand')}>
        画笔
      </button>
      <button
        onClick={onClear}
        style={{
          marginLeft: '20px',
          background: '#ff4d4f',
          color: 'white',
        }}
      >
        清除所有
      </button>
      <button onClick={onUndo} disabled={historyLength === 0} style={{ marginLeft: '10px' }}>
        上一步 (Ctrl+Z)
      </button>
      <button onClick={onRedo} disabled={redoHistoryLength === 0} style={{ marginLeft: '10px' }}>
        下一步 (Ctrl+Y)
      </button>
      <button onClick={onExport} style={{ marginLeft: '10px' }}>
        导出
      </button>
    </div>
  );
};

export default ToolBar;
