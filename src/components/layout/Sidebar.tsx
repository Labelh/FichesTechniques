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
        width: '256px',
        zIndex: 1040,
        paddingTop: '64px',
        backgroundColor: 'rgba(18, 18, 18, 0.98)',
        borderRight: '1px solid rgba(64, 64, 64, 0.3)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <div className="d-flex flex-column h-100">
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
                      'd-flex align-items-center justify-content-between px-3 py-3 rounded',
                      isActive
                        ? 'bg-primary shadow-sm'
                        : 'text-white hover-bg-secondary'
                    )}
                    style={{
                      transition: 'all 0.2s ease',
                      backgroundColor: isActive ? undefined : 'transparent'
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className={cn(
                          'd-flex align-items-center justify-content-center rounded',
                          isActive ? 'bg-white bg-opacity-10' : 'bg-transparent'
                        )}
                        style={{
                          width: '32px',
                          height: '32px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <item.icon
                          className={isActive ? 'text-white' : 'text-muted'}
                          size={18}
                        />
                      </div>
                      <span className={cn(
                        'fw-medium',
                        isActive ? 'text-white' : 'text-muted'
                      )}
                      style={{ fontSize: '0.9rem' }}
                      >
                        {item.name}
                      </span>
                    </div>
                    {item.count !== undefined && (
                      <span
                        className={cn(
                          'badge rounded-pill',
                          isActive ? 'bg-white text-primary' : 'bg-secondary bg-opacity-25'
                        )}
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
        <div className="p-3 border-top border-secondary border-opacity-10">
          <div className="text-center">
            <p className="mb-0 text-muted" style={{ fontSize: '0.7rem' }}>
              Version 1.0.0
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
