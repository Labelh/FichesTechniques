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
                    'flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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

        {/* Statistics */}
        {stats && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Statistiques
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-600 dark:text-gray-400">Brouillons</span>
                <span className="font-semibold text-gray-900 dark:text-white px-2 py-0.5 bg-white dark:bg-gray-700 rounded">
                  {stats.draft || 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-600 dark:text-gray-400">En cours</span>
                <span className="font-semibold text-gray-900 dark:text-white px-2 py-0.5 bg-white dark:bg-gray-700 rounded">
                  {stats.enCours || 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-600 dark:text-gray-400">Terminées</span>
                <span className="font-semibold text-gray-900 dark:text-white px-2 py-0.5 bg-white dark:bg-gray-700 rounded">
                  {stats.completed || 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
