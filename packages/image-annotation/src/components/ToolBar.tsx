import React, { memo } from 'react';
import './ToolBar.css';
import { ToolType } from '../types/annotations';
import { RectangleIcon, CircleIcon, ArrowIcon, TextIcon, BrushIcon, ClearIcon, UndoIcon, RedoIcon, ExportIcon, ColorIcon, WidthIcon, ZoomInIcon, ZoomOutIcon, UploadIcon } from './Icons';

interface ToolBarProps {
  currentTool: string | null;
  onSelectTool: (tool: ToolType) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onUpload?: () => void;
  history: { canUndo: boolean; canRedo: boolean };
  strokeColor: string;
  lineWidth: number;
  onColorChange: (color: string) => void;
  onLineWidthChange: (width: number) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  zoomRatio?: number;
}

const ToolBar = (props: ToolBarProps) => {
  const { currentTool, onSelectTool, onClear, onUndo, onRedo, onExport, onUpload, history, strokeColor, lineWidth, onColorChange, onLineWidthChange, onZoomIn, onZoomOut, zoomRatio = 100 } = props;

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <div className="tool-group">
          <button className={`tool-button ${currentTool === 'rectangle' ? 'active' : ''}`} onClick={() => onSelectTool('rectangle')} title="矩形" aria-label="矩形工具">
            <span aria-hidden="true">
              <RectangleIcon size={18} />
            </span>
          </button>
          <button className={`tool-button ${currentTool === 'circle' ? 'active' : ''}`} onClick={() => onSelectTool('circle')} title="圆形" aria-label="圆形工具">
            <span aria-hidden="true">
              <CircleIcon size={18} />
            </span>
          </button>
          <button className={`tool-button ${currentTool === 'arrow' ? 'active' : ''}`} onClick={() => onSelectTool('arrow')} title="箭头" aria-label="箭头工具">
            <span aria-hidden="true">
              <ArrowIcon size={18} />
            </span>
          </button>
          <button className={`tool-button ${currentTool === 'text' ? 'active' : ''}`} onClick={() => onSelectTool('text')} title="文字" aria-label="文字工具">
            <span aria-hidden="true">
              <TextIcon size={18} />
            </span>
          </button>
          <button className={`tool-button ${currentTool === 'freehand' ? 'active' : ''}`} onClick={() => onSelectTool('freehand')} title="画笔" aria-label="画笔工具">
            <span aria-hidden="true">
              <BrushIcon size={18} />
            </span>
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
            <input id="color-picker" type="color" value={strokeColor} onChange={(e) => onColorChange(e.target.value)} className="color-picker" aria-label="选择标注颜色" />
          </div>
          <div className="control-group">
            <div title="线宽">
              <WidthIcon size={16} className="control-icon" />
            </div>
            <input id="line-width" type="range" min="1" max="20" value={lineWidth} onChange={(e) => onLineWidthChange(Number(e.target.value))} className="width-slider" aria-label="调整标注线宽" />
            <span className="width-value">{lineWidth}px</span>
          </div>
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <div className="zoom-controls">
          <button className="zoom-button" onClick={onZoomIn} title="放大" aria-label="放大">
            <span aria-hidden="true">
              <ZoomInIcon size={16} />
            </span>
          </button>
          <span className="zoom-ratio">{Math.round(zoomRatio)}%</span>
          <button className="zoom-button" onClick={onZoomOut} title="缩小" aria-label="缩小">
            <span aria-hidden="true">
              <ZoomOutIcon size={16} />
            </span>
          </button>
        </div>
      </div>

      <div className="toolbar-divider" />
      <div className="toolbar-section">
        <div className="action-group">
          <button className="action-button undo-button" onClick={onUndo} disabled={!history.canUndo} title="撤销 (Ctrl+Z)" aria-label="撤销">
            <span aria-hidden="true">
              <UndoIcon size={16} />
            </span>
          </button>
          <button className="action-button redo-button" onClick={onRedo} disabled={!history.canRedo} title="前进 (Ctrl+Y)" aria-label="重做">
            <span aria-hidden="true">
              <RedoIcon size={16} />
            </span>
          </button>
          <button className="action-button clear-button" onClick={onClear} title="清除所有" aria-label="清除所有标注">
            <span aria-hidden="true">
              <ClearIcon size={16} />
            </span>
          </button>
          {onUpload && (
            <button className="action-button upload-button" onClick={onUpload} title="上传图片" aria-label="上传图片">
              <span aria-hidden="true">
                <UploadIcon size={16} />
              </span>
            </button>
          )}
          <button className="action-button export-button" onClick={onExport} title="导出" aria-label="导出图片">
            <span aria-hidden="true">
              <ExportIcon size={16} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(ToolBar);
