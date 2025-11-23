import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAppStore } from '@/store/useAppStore';

export default function Layout() {
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Floating Menu Button - Only visible when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-6 left-6 z-50 flex items-center justify-center w-12 h-12 rounded-xl shadow-lg hover:scale-105 transition-all"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--color-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-primary)';
            e.currentTarget.style.borderColor = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-surface)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          <Menu style={{ color: 'var(--color-text-primary)' }} size={22} />
        </button>
      )}

      {/* Main Content */}
      <main
        className={`flex-1 overflow-auto transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'ml-[280px]' : 'ml-0'
        }`}
      >
        <div className="container-fluid p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
