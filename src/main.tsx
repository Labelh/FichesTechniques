import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { initializeFirestore } from './lib/firestore';

// Initialiser Firebase/Firestore
initializeFirestore()
  .then(() => {
    console.log('✅ Firebase initialisé');
  })
  .catch((error) => {
    console.error('❌ Erreur d\'initialisation de Firebase:', error);
  });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/FichesTechniques">
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
