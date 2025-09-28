# 图片标注组件（image-annotation）

基于 React + TypeScript 的 Web 图片标注组件，支持矩形、圆、箭头、文字、自由画笔等工具，提供撤销/重做、拖拽、导出、快捷键等能力。

## ✨ 功能特性

- **多种标注类型**：矩形、圆形、箭头、文字、自由画笔
- **样式自定义**：可调整标注颜色和线宽
- **交互操作**：支持拖拽移动、撤销\前进操作、删除标注
- **数据导出**：可导出标注后的图片以及标注数据
- **抗模糊绘制**：基于 DPR 的清晰绘制，避免高清屏模糊
- **等比居中**：图片在 canvas 中按原始比例居中显示
- **快捷键支持**：支持键盘快捷键操作

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
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
import { useState } from 'react';
import { ImageAnnotation, type Annotation } from '@frank17008/image-annotation';
import '@frank17008/image-annotation/dist/index.css';

export default function App() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  return (
    <div style={{ height: 600 }}>
      <ImageAnnotation
        src="https://example.com/image.jpg"
        onChange={setAnnotations}
      />
    </div>
  );
}
```

### 工具栏功能

1. **颜色选择器**：选择标注线条的颜色
2. **线宽调整**：调整标注线条的粗细（1-20px）
3. **工具选择**：
   - 矩形工具：绘制矩形标注
   - 圆形工具：绘制圆形标注
   - 箭头工具：绘制箭头标注
   - 文字工具：添加文字标注
   - 自由画笔：自由绘制任意形状
4. **操作按钮**：
   - 清除所有：清空画布上的所有标注
   - 撤销：撤销上一次操作（支持 Ctrl+Z 快捷键）
   - 前进：回退撤销操作（支持 Ctrl+Y 快捷键）
   - 导出：将标注后的图片保存到本地

### 快捷键操作

- **Delete**：删除选中的标注
- **Ctrl+Z**：撤销上一步操作
- **Ctrl+Y**：重做
- **Escape**：取消文字输入状态

## 🧩 组件 API

### ImageAnnotation

Props：

- `src: string`（必填）图片地址
- `onChange?: (annotations: Annotation[]) => void` 标注变化回调
- `className?: string` 父容器类名

```

## 🛠 技术栈

- React 18 + TypeScript
- Canvas 2D
- pnpm / tsup
```
