import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAppStore } from '@/store/useAppStore';

export default function Layout() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <div className="flex flex-1 relative">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main
          className={`flex-1 overflow-auto pt-16 transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'ml-[260px]' : 'ml-0'
          }`}
        >
          <div className="container-fluid p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
