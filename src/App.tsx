import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import ProcedureEditor from './pages/ProcedureEditor';
import ProcedureView from './pages/ProcedureView';
import ToolsLibrary from './pages/ToolsLibrary';
import Templates from './pages/Templates';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function App() {
  // Activer le mode sombre par défaut
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="procedures/:id" element={<ProcedureView />} />
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
