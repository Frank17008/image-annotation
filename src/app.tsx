import { useState } from 'react';
import { type Annotation, ImageAnnotation } from '@frank17008/image-annotation';
import '@frank17008/image-annotation/dist/index.css';
// import { defaultAnnotations } from './const';
import './app.css';
export default function App() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  const onChange = (annotations: Annotation[]) => {
    setAnnotations(annotations);
  };
  return (
    <div className="container">
      <div style={{ width: 800, height: '100%' }}>
        {/* value值回显 */}
        {/* <ImageAnnotation value={defaultAnnotations} src="https://img1.baidu.com/it/u=2871000795,3971904304&fm=253&fmt=auto&app=138&f=JPEG?w=450&h=300" onChange={onChange} /> */}
        <ImageAnnotation src="https://img1.baidu.com/it/u=2871000795,3971904304&fm=253&fmt=auto&app=138&f=JPEG?w=450&h=300" onChange={onChange} />
      </div>
      <div className="annotation-info">
        <h3>当前标注 ({annotations.length}个):</h3>
        <pre>{JSON.stringify(annotations, null, 2)}</pre>
      </div>
    </div>
  );
}
