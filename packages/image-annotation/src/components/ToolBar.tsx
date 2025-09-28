import React, { memo } from 'react';
import './ToolBar.css';
import { ToolType } from '../types/annotations';
import { RectangleIcon, CircleIcon, ArrowIcon, TextIcon, BrushIcon, ClearIcon, UndoIcon, RedoIcon, ExportIcon, ColorIcon, WidthIcon } from './Icons';

interface ToolBarProps {
  currentTool: string | null;
  onSelectTool: (tool: ToolType) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  history: { canUndo: boolean; canRedo: boolean };
  strokeColor: string;
  lineWidth: number;
  onColorChange: (color: string) => void;
  onLineWidthChange: (width: number) => void;
}

const ToolBar = (props: ToolBarProps) => {
  const { currentTool, onSelectTool, onClear, onUndo, onRedo, onExport, history, strokeColor, lineWidth, onColorChange, onLineWidthChange } = props;

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <div className="tool-group">
          <button className={`tool-button ${currentTool === 'rectangle' ? 'active' : ''}`} onClick={() => onSelectTool('rectangle')} title="矩形">
            <RectangleIcon size={18} />
          </button>
          <button className={`tool-button ${currentTool === 'circle' ? 'active' : ''}`} onClick={() => onSelectTool('circle')} title="圆形">
            <CircleIcon size={18} />
          </button>
          <button className={`tool-button ${currentTool === 'arrow' ? 'active' : ''}`} onClick={() => onSelectTool('arrow')} title="箭头">
            <ArrowIcon size={18} />
          </button>
          <button className={`tool-button ${currentTool === 'text' ? 'active' : ''}`} onClick={() => onSelectTool('text')} title="文字">
            <TextIcon size={18} />
          </button>
          <button className={`tool-button ${currentTool === 'freehand' ? 'active' : ''}`} onClick={() => onSelectTool('freehand')} title="画笔">
            <BrushIcon size={18} />
          </button>
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <div className="brush-controls">
          <div className="control-group">
            <div title="颜色">
              <ColorIcon size={16} className="control-icon" />
            </div>
            <input id="color-picker" type="color" value={strokeColor} onChange={(e) => onColorChange(e.target.value)} className="color-picker" />
          </div>
          <div className="control-group">
            <div title="线宽">
              <WidthIcon size={16} className="control-icon" />
            </div>
            <input id="line-width" type="range" min="1" max="20" value={lineWidth} onChange={(e) => onLineWidthChange(Number(e.target.value))} className="width-slider" />
            <span className="width-value">{lineWidth}px</span>
          </div>
        </div>
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-section">
        <div className="action-group">
          <button className="action-button undo-button" onClick={onUndo} disabled={!history.canUndo} title="撤销 (Ctrl+Z)">
            <UndoIcon size={16} />
          </button>
          <button className="action-button redo-button" onClick={onRedo} disabled={!history.canRedo} title="前进 (Ctrl+Y)">
            <RedoIcon size={16} />
          </button>
          <button className="action-button clear-button" onClick={onClear} title="清除所有">
            <ClearIcon size={16} />
          </button>
          <button className="action-button export-button" onClick={onExport} title="导出">
            <ExportIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(ToolBar);
