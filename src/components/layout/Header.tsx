import { Link } from 'react-router-dom';
import {
  Menu,
  FileText,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';

export default function Header() {
  const { toggleSidebar } = useAppStore();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#1f1f1f] border-b border-[#323232]  z-[1050]">
      <div className="container-fluid h-full px-4">
        <div className="flex items-center h-full">
          {/* Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-3"
          >
            <Menu style={{ color: 'var(--color-text-secondary)' }} size={22} />
          </Button>

          {/* Logo & Title */}
          <Link to="/" className="no-underline flex items-center gap-3 mr-auto">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80  /30">
              <FileText className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">
                Fiches Techniques
              </h1>
              <p className="text-xs leading-none mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                Gestion de procédures
              </p>
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Settings */}
            <Link to="/settings">
              <Button variant="ghost" size="icon" title="Paramètres">
                <SettingsIcon style={{ color: 'var(--color-text-secondary)' }} size={20} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
