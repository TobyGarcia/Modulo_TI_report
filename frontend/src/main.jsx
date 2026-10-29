import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import PwaUpdatePrompt from './components/PwaUpdatePrompt.jsx';
import './index.css';
import { configureApiBaseUrl } from './utils/apiBaseUrl.js';

configureApiBaseUrl();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <PwaUpdatePrompt />
  </React.StrictMode>,
);
