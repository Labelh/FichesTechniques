import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wrench,
  FolderKanban,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';
import { useProcedureStats } from '@/hooks/useProcedures';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const location = useLocation();
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const stats = useProcedureStats();

  const navItems = [
    {
      name: 'Tableau de bord',
      href: '/',
      icon: LayoutDashboard,
      count: stats?.total,
    },
    {
      name: 'Bibliothèque d\'outils',
      href: '/tools',
      icon: Wrench,
    },
    {
      name: 'Templates',
      href: '/templates',
      icon: FolderKanban,
    },
  ];

  if (!sidebarOpen) return null;

  return (
    <aside
      className="position-fixed start-0 top-0 h-100 border-end overflow-auto"
      style={{
        width: '260px',
        zIndex: 1040,
        paddingTop: '0',
        backgroundColor: '#1f1f1f',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <div className="d-flex flex-column h-100">
        {/* Sidebar Header */}
        <div className="p-3 border-bottom" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <div>
              <h1 className="mb-0" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>FichesTech</h1>
              <p className="mb-0 mt-1" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgb(249, 55, 5)', lineHeight: 1 }}>Ajust'82</p>
            </div>
          </div>
        </div>

        {/* New Procedure Button */}
        <div className="p-3">
          <Link to="/procedures/new">
            <Button className="w-100 shadow" size="lg">
              <Plus className="me-2" size={20} />
              Nouvelle Procédure
            </Button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-fill px-3 py-2">
          <div className="d-flex flex-column gap-1">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href));

              return (
                <Link key={item.href} to={item.href} className="text-decoration-none">
                  <div
                    className={cn(
                      'd-flex align-items-center gap-3 px-3 py-3 rounded',
                      isActive ? '' : ''
                    )}
                    style={{
                      transition: 'all 0.2s ease',
                      backgroundColor: isActive ? 'rgb(249, 55, 5)' : 'transparent',
                      color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.9375rem',
                      fontWeight: 500
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.color = '#ffffff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                      }
                    }}
                  >
                    <item.icon size={20} />
                    <span className="flex-grow-1">{item.name}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span
                        className="badge rounded-pill d-flex align-items-center justify-content-center"
                        style={{
                          backgroundColor: 'rgb(249, 55, 5)',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          minWidth: '1.25rem',
                          height: '1.25rem',
                          padding: '0.125rem 0.5rem'
                        }}
                      >
                        {item.count}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-top" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: 'rgb(249, 55, 5)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  flexShrink: 0
                }}
              >
                U
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#ffffff' }}>Utilisateur</div>
                <div style={{ fontSize: '0.75rem', color: '#808080' }}>Gestionnaire</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
