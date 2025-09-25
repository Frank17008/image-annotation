import { useState } from 'react';
import { type Annotation, ImageAnnotation } from '@frank17008/image-annotation';
import '@frank17008/image-annotation/dist/index.css';
import './app.css';
export default function App() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const onChange = (annotations: Annotation[]) => {
    setAnnotations(annotations);
  };
  return (
    <div className="container">
      <ImageAnnotation src="https://img1.baa.bitautotech.com/dzusergroupfiles/2024/11/06/e2a4e9bb9e854429bed46ba1e343b47a.jpg" onChange={onChange} />
      <div className="annotation-info">
        <h3>当前标注 ({annotations.length}个):</h3>
        <pre>{JSON.stringify(annotations, null, 2)}</pre>
      </div>
    </div>
  );
}
