import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wrench,
  FolderKanban,
  Plus,
  Package,
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
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-background border-r border-white/10 overflow-auto z-[1040] backdrop-blur-sm">
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8">
              <Package className="w-8 h-8 text-primary" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none">
                FichesTech
              </h1>
              <p className="text-sm font-semibold text-primary leading-none mt-1">
                Ajust'82
              </p>
            </div>
          </div>
        </div>

        {/* New Procedure Button */}
        <div className="p-4">
          <Link to="/procedures/new" className="block">
            <Button className="w-full " size="lg">
              <Plus className="mr-2" size={20} />
              Nouvelle Procédure
            </Button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="no-underline"
                >
                  <div className={cn('sidebar-link', isActive && 'active')}>
                    <item.icon size={20} />
                    <span className="flex-1">{item.name}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="sidebar-badge">{item.count}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-white font-semibold text-sm flex-shrink-0">
                U
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">Utilisateur</div>
                <div className="text-xs text-text-secondary">Gestionnaire</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
