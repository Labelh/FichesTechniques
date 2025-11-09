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
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-surface border-gray-200 dark:border-gray-700 overflow-y-auto backdrop-blur-sm">
      <div className="flex flex-col h-full pt-16">
        {/* New Procedure Button */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Link to="/procedures/new">
            <Button className="w-full shadow-md hover:shadow-lg transition-all" size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Nouvelle Procédure
            </Button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href));

            return (
              <Link key={item.href} to={item.href}>
                <div
                  className={cn(
                    'flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-white hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <div className="flex items-center">
                    <item.icon className="h-5 w-5 mr-3" />
                    <span>{item.name}</span>
                  </div>
                  {item.count !== undefined && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-semibold',
                        isActive
                          ? 'bg-white text-primary'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

      </div>
    </aside>
  );
}
