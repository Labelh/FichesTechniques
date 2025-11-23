import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wrench,
  FolderKanban,
  Plus,
  Package,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';
import { useProcedureStats } from '@/hooks/useProcedures';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useAppStore();
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
      className="fixed left-0 top-0 h-screen w-[280px] overflow-auto z-[1040]"
      style={{
        backgroundColor: 'var(--color-background)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div
          className="p-6"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark">
                <Package className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white leading-none">
                  FichesTech
                </h1>
                <p className="text-sm font-semibold text-primary leading-none mt-1.5">
                  Ajust'82
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="hover:bg-white/5"
            >
              <Menu style={{ color: 'var(--color-text-secondary)' }} size={20} />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4">
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
      </div>
    </aside>
  );
}
