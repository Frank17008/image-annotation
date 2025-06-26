import React from 'react';
import ReactDOM from 'react-dom/client';
import ImageAnnotation from './components/ImageAnnotation';

const rootElement = document.getElementById('app');
if (!rootElement) throw new Error('Root element not found in DOM');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ImageAnnotation src="https://img1.baa.bitautotech.com/dzusergroupfiles/2024/11/06/e2a4e9bb9e854429bed46ba1e343b47a.jpg" />
  </React.StrictMode>
);