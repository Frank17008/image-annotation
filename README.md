# 图片标注组件（image-annotation）

基于 React + TypeScript 的 Web 图片标注组件，支持矩形、圆、箭头、文字、自由画笔等工具，提供撤销/重做、拖拽、导出、快捷键等能力。

## ✨ 功能特性

- **多种标注类型**：矩形、圆形、箭头、文字、自由画笔
- **样式自定义**：可调整标注颜色和线宽
- **交互操作**：支持拖拽移动、撤销操作、删除标注
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

### 基本使用（作为依赖包）

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

说明：

- 组件会让 canvas 充满父容器（即外层容器需有明确高度或可计算的高度）。
- 图片会在 canvas 内按原始宽高比居中显示；DPR 自适配避免模糊。

### 本仓库内本地示例

仓库自带示例应用（`/src`），运行方式见“开发模式”。

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
- **Ctrl+Y**：重做
- **Escape**：取消文字输入状态

## 🧩 组件 API

### ImageAnnotation

Props：

- `src: string`（必填）图片地址
- `onChange?: (annotations: Annotation[]) => void` 标注变化回调

行为：

- 画布尺寸由父容器决定（组件内部使 canvas 填满父容器）。
- 图片会在当前 canvas 尺寸内按比例缩放并居中显示。
- 组件对高清屏进行 DPR 处理，保证绘制清晰。

### Annotation（标注数据结构）

核心字段（简化版）：

- 公共：`id?: string`, `color: string`, `lineWidth?: number`
- 矩形：`{ type: 'rectangle', x, y, width, height }`
- 圆：`{ type: 'circle', x, y, radius }`
- 箭头：`{ type: 'arrow', x, y, width, height }`（起点为 `x,y`，终点为 `x+width,y+height`）
- 文字：`{ type: 'text', x, y, text }`
- 自由画笔：`{ type: 'freehand', points: {x,y}[] }`

> 完整类型定义见 `packages/image-annotation/src/types/annotations.ts`。

## 🧱 布局与清晰度建议

- 外层容器需有明确高度（例如固定高、百分比高并确保祖先可计算）。
- `ImageAnnotation` 会让 `canvas` 填满父容器。
- 组件内部在每次绘制前同步 canvas 尺寸并进行 DPR 适配，避免模糊。

## 📦 打包 & 发布

包入口在 `packages/image-annotation`，构建产物位于其 `dist/`。

常用命令：

```bash
pnpm -w build                      # 构建所有包
pnpm -w --filter image-annotation build  # 仅构建组件包
```

## 🛠 技术栈

- React 18 + TypeScript
- Canvas 2D
- pnpm / tsup
