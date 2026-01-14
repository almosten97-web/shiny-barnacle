
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App'; // Adjusted path to point to src/App.tsx
import './src/index.css'; // Adjusted path to point to src/index.css

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Failed to find the root element. The application cannot be mounted.");
}
