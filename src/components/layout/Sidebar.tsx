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
    <aside className="position-fixed start-0 top-0 h-100 border-end bg-dark overflow-auto" style={{ width: '256px', zIndex: 1040, paddingTop: '64px' }}>
      <div className="d-flex flex-column h-100">
        {/* New Procedure Button */}
        <div className="p-3 border-bottom">
          <Link to="/procedures/new">
            <Button className="w-100" size="lg">
              <Plus className="me-2" size={20} />
              Nouvelle Procédure
            </Button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-fill px-3 py-3">
          <div className="d-flex flex-column gap-1">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href));

              return (
                <Link key={item.href} to={item.href} className="text-decoration-none">
                  <div
                    className={cn(
                      'd-flex align-items-center justify-content-between px-3 py-2 rounded text-white',
                      isActive
                        ? 'bg-primary shadow-sm'
                        : 'hover-bg-secondary'
                    )}
                    style={{ transition: 'all 0.2s' }}
                  >
                    <div className="d-flex align-items-center">
                      <item.icon className="me-3 text-muted" size={20} />
                      <span className="small fw-medium">{item.name}</span>
                    </div>
                    {item.count !== undefined && (
                      <span className="badge bg-secondary">
                        {item.count}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

      </div>
    </aside>
  );
}
