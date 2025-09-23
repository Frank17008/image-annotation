# 图片标注工具 (Image-Annotation)

一个基于 React Native 的图片标注组件，支持多种标注类型、实时预览和数据导出。

## ✨ 功能特性

- **多种标注类型**：支持矩形、圆形、箭头、文字和自由绘制线条
- **样式自定义**：可调整标注颜色和线宽
- **交互操作**：支持拖拽移动、撤销操作、删除标注
- **数据导出**：可导出标注后的图片以及标注数据
- **响应式设计**：自动适应不同尺寸的容器
- **快捷键支持**：支持键盘快捷键操作

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm start
```

在浏览器中打开 http://localhost:3000 查看应用。

### 构建生产版本

```bash
pnpm run build
```

构建后的文件将生成在 `build` 目录中。

## 📖 使用方法

### 基本使用

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import ImageAnnotation from './components/ImageAnnotation';

const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(<ImageAnnotation src="https://example.com/image.jpg" />);
```

### 工具栏功能

1. **颜色选择器**：选择标注线条的颜色
2. **线宽调整**：调整标注线条的粗细（1-10px）
3. **工具选择**：
   - 矩形工具：绘制矩形标注
   - 圆形工具：绘制圆形标注
   - 箭头工具：绘制箭头标注
   - 文字工具：添加文字标注
   - 自由线条：自由绘制任意形状
4. **操作按钮**：
   - 清除所有：清空画布上的所有标注
   - 上一步：撤销上一次操作（支持 Ctrl+Z 快捷键）
   - 导出：将标注后的图片保存到本地

### 快捷键操作

- **Delete**：删除选中的标注
- **Ctrl+Z**：撤销上一步操作
- **Escape**：取消文字输入状态
