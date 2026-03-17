# 图片标注组件（image-annotation）

基于 React + TypeScript 的 Web 图片标注组件，支持矩形、圆、箭头、文字、自由画笔等工具，提供撤销/重做、拖拽、导出、快捷键、滚轮缩放等能力。

## ✨ 功能特性

- **多种标注类型**：矩形、圆形、箭头、文字、自由画笔
- **样式自定义**：可调整标注颜色和线宽
- **交互操作**：支持拖拽移动、撤销/前进操作、删除标注
- **数据导出**：可导出标注后的图片以及标注数据
- **抗模糊绘制**：基于 DPR 的清晰绘制，避免高清屏模糊
- **等比居中**：图片在 canvas 中按原始比例居中显示
- **快捷键支持**：支持键盘快捷键操作
- **滚轮缩放**：支持鼠标滚轮缩放画布（以鼠标指针为中心）
- **拖拽平移**：按住空格键可拖拽移动画布
- **图片上传**：支持通过回调函数实现自定义图片上传

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

### 自定义图片上传

```jsx
import { useState, useRef } from 'react';
import { ImageAnnotation, type Annotation } from '@frank17008/image-annotation';
import '@frank17008/image-annotation/dist/index.css';

export default function App() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [imageSrc, setImageSrc] = useState('https://example.com/image.jpg');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          setImageSrc(result);
          setAnnotations([]); // 上传新图片后清空标注
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  return (
    <div style={{ height: 600 }}>
      <ImageAnnotation
        src={imageSrc}
        onChange={setAnnotations}
        onUpload={handleUpload}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
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
   - 上传图片：自定义图片上传（需配置 onUpload 回调）

### 缩放与平移

- **鼠标滚轮**：滚轮向上放大，向下缩小（以鼠标指针为中心）
- **Ctrl + +/=**：放大画布
- **Ctrl + -**：缩小画布
- **Ctrl + 0**：重置缩放为 100%
- **空格键 + 拖拽**：平移画布

### 快捷键操作

- **Delete**：删除选中的标注
- **Ctrl+Z**：撤销上一步操作
- **Ctrl+Y**：重做
- **Escape**：取消文字输入状态
- **Ctrl++**：放大
- **Ctrl+-**：缩小
- **Ctrl+0**：重置缩放

## 🧩 组件 API

### ImageAnnotation

Props：

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `src` | `string` | ✅ | 图片地址，支持 URL 或 Base64 |
| `onChange` | `(annotations: Annotation[]) => void` | ❌ | 标注变化回调，每次标注操作后触发 |
| `className` | `string` | ❌ | 父容器类名 |
| `value` | `Annotation[]` | ❌ | 受控模式下的标注数据 |
| `onUpload` | `() => void` | ❌ | 上传图片按钮点击回调，需自行处理文件选择 |

### Annotation（标注数据结构）

核心字段：

- **公共**：`id?: string`, `color: string`, `lineWidth?: number`
- **矩形**：`{ type: 'rectangle', x, y, width, height }`
- **圆形**：`{ type: 'circle', x, y, radius }`
- **箭头**：`{ type: 'arrow', x, y, toX, toY }`
- **文字**：`{ type: 'text', x, y, text }`
- **自由画笔**：`{ type: 'freehand', points: {x, y}[] }`

> 完整类型定义见 `src/types/annotations.ts`

## 🧱 布局与清晰度建议

- 外层容器需有明确高度（例如固定高、百分比高并确保祖先可计算）。
- `ImageAnnotation` 会让 `canvas` 填满父容器。
- 组件内部在每次绘制前同步 canvas 尺寸并进行 DPR 适配，避免模糊。

## 🛠 技术栈

- React 18 + TypeScript
- Canvas 2D
- pnpm / tsup
