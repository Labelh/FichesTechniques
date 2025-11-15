import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { initializeFirestore } from '@/lib/firestore';
import { testFirestoreConnection } from './test-firestore';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import ProcedureEditor from './pages/ProcedureEditor';
import ToolsLibrary from './pages/ToolsLibrary';
import Templates from './pages/Templates';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function App() {
  // Activer le mode sombre par défaut et initialiser Firestore
  useEffect(() => {
    document.documentElement.classList.add('dark');

    // DIAGNOSTIC : Tester la connexion Firestore en premier
    testFirestoreConnection().then(results => {
      if (results.config && results.read && results.write) {
        console.log('✅ Firestore connecté, initialisation...');
        // Initialiser Firestore (créer catégories et préférences par défaut)
        initializeFirestore().catch(error => {
          console.error('Erreur lors de l\'initialisation de Firestore:', error);
        });
      } else {
        console.error('❌ Firestore non fonctionnel. Consultez les logs ci-dessus.');
      }
    });
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="procedures/:id/edit" element={<ProcedureEditor />} />
          <Route path="procedures/new" element={<ProcedureEditor />} />
          <Route path="tools" element={<ToolsLibrary />} />
          <Route path="templates" element={<Templates />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </>
  );
}

export default App;
