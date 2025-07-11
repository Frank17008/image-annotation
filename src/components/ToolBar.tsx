import React from 'react';
import './ToolBar.css';

interface ToolBarProps {
  currentTool: string | null;
  onSelectTool: (tool: string) => void;
  onClear: () => void;
  onUndo: () => void;
  onDownload: () => void;
  historyLength: number;
}

export const ToolBar: React.FC<ToolBarProps> = (props: ToolBarProps) => {
  const { currentTool, onSelectTool, onClear, onUndo, onDownload, historyLength } = props;
  return (
    <div className="toolbar">
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
        自由线条
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
        撤销 (Ctrl+Z)
      </button>
      <button onClick={onDownload} style={{ marginLeft: '10px' }}>
        导出
      </button>
    </div>
  );
};
