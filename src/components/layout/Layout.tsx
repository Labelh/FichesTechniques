import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAppStore } from '@/store/useAppStore';

export default function Layout() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);

  return (
    <div className="d-flex flex-column min-vh-100 bg-dark">
      <Header />

      <div className="d-flex flex-grow-1 position-relative">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main
          className="flex-grow-1 overflow-auto"
          style={{
            marginLeft: sidebarOpen ? '256px' : '0',
            transition: 'margin-left 0.3s ease',
            paddingTop: '64px', // Header height
          }}
        >
          <div className="container-fluid p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
