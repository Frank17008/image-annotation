import { useState } from 'react';
import { type Annotation, ImageAnnotation } from '@frank17008/image-annotation';
import '@frank17008/image-annotation/dist/index.css';
// import { defaultAnnotations } from './const';
import './app.css';

export default function App() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  function handleChange(nextAnnotations: Annotation[]) {
    setAnnotations(nextAnnotations);
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header-title">
          <span className="app-badge">DEMO</span>
          <h1 className="app-title">图片标注组件 · Image Annotation</h1>
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
              src="https://img1.baidu.com/it/u=2871000795,3971904304&fm=253&fmt=auto&app=138&f=JPEG?w=900&h=600"
              onChange={handleChange}
            />
          </div>
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
