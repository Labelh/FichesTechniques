import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { initializeFirestore } from '@/lib/firestore';
import { testFirestoreConnection } from './test-firestore';
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';
import NotFound from './pages/NotFound';

// Lazy loading des pages principales pour réduire la taille du bundle initial
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProcedureEditor = lazy(() => import('./pages/ProcedureEditor'));
const ToolsLibrary = lazy(() => import('./pages/ToolsLibrary'));
const Templates = lazy(() => import('./pages/Templates'));

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
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="procedures/:id/edit" element={<ProcedureEditor />} />
          <Route path="procedures/new" element={<ProcedureEditor />} />
          <Route path="tools" element={<ToolsLibrary />} />
          <Route path="templates" element={<Templates />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
