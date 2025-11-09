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
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-700 backdrop-blur-md" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="flex h-16 items-center px-4">
        {/* Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="mr-4"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo & Title */}
        <Link to="/" className="flex items-center space-x-3 mr-8">
          <FileText className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-white tracking-wide">
            Fiches Techniques
          </span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Settings */}
          <Link to="/settings">
            <Button variant="ghost" size="icon" title="Paramètres">
              <SettingsIcon className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
