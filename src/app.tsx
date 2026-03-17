import { useState, useRef, useCallback } from 'react';
import { type Annotation, ImageAnnotation } from '@frank17008/image-annotation';
import '@frank17008/image-annotation/dist/index.css';
// import { defaultAnnotations } from './const';
import './app.css';

const DEFAULT_IMAGE = 'https://img1.baidu.com/it/u=2871000795,3971904304&fm=253&fmt=auto&app=138&f=JPEG?w=900&h=600';

export default function App() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [imageSrc, setImageSrc] = useState(DEFAULT_IMAGE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleChange(nextAnnotations: Annotation[]) {
    setAnnotations(nextAnnotations);
  }

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          setImageSrc(result);
          setAnnotations([]);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-title">
          <span className="app-badge">DEMO</span>
          <h1 className="app-title">图片标注组件 · Image Annotation</h1>
          <a
            href="https://github.com/frank17008/image-annotation"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
            title="查看 GitHub 仓库"
          >
            <svg height="24" viewBox="0 0 16 16" version="1.1" width="24" aria-hidden="true" fill="currentColor">
              <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
          </a>
        </div>
        <p className="app-subtitle">在浏览器中快速完成矩形、圆形、箭头、文字与自由画笔标注，并实时查看结构化标注数据。</p>
      </header>

      <main className="app-main">
        <section className="annotation-panel" aria-label="图片标注区域">
          <div className="annotation-panel-header">
            <div>
              <h2 className="panel-title">标注画布</h2>
              <p className="panel-description">尝试在图片上圈选重点区域、添加说明文字，体验完整标注流程。</p>
            </div>
            <div className="panel-meta">
              <span className="meta-label">当前标注数</span>
              <span className="meta-value">{annotations.length}</span>
            </div>
          </div>
          <div className="annotation-canvas-wrapper">
            <ImageAnnotation
              className="annotation-canvas"
              src={imageSrc}
              onChange={handleChange}
              onUpload={handleUpload}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </section>

        <aside className="info-panel" aria-label="标注数据与说明">
          <div className="info-panel-header">
            <h2 className="panel-title">标注数据预览</h2>
            <p className="panel-description">组件通过 <code>onChange</code> 将所有标注以 JSON 形式回传，方便你持久化或上传到后端。</p>
          </div>
          <div className="info-panel-body">
            <div className="info-section">
              <h3 className="info-section-title">实时 Annotation 数组</h3>
              <p className="info-section-description">左侧每次标注、拖拽、删除都会触发数据更新。</p>
              <div className="annotation-json" aria-label="标注 JSON 数据">
                <pre>{JSON.stringify(annotations, null, 2)}</pre>
              </div>
            </div>

            <div className="info-section info-section-secondary">
              <h3 className="info-section-title">集成方式小贴士</h3>
              <ul className="tips-list">
                <li>为外层容器设置明确高度，例如 <code>height: 600px</code>，组件会自动让 canvas 填满容器。</li>
                <li>通过 <code>value</code> 受控回显已有标注，适合编辑已有图片标注场景。</li>
                <li>监听 <code>onChange</code> 把标注同步到状态管理或发送到后端接口。</li>
              </ul>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
