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
    <header className="navbar navbar-dark bg-dark border-bottom position-sticky top-0" style={{ zIndex: 1050 }}>
      <div className="container-fluid">
        {/* Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="me-3"
        >
          <Menu className="text-muted" size={20} />
        </Button>

        {/* Logo & Title */}
        <Link to="/" className="navbar-brand d-flex align-items-center gap-2 me-auto">
          <FileText className="text-primary" size={24} />
          <span className="fs-5 fw-bold">
            Fiches Techniques
          </span>
        </Link>

        {/* Actions */}
        <div className="d-flex align-items-center gap-2">
          {/* Settings */}
          <Link to="/settings">
            <Button variant="ghost" size="icon" title="Paramètres">
              <SettingsIcon className="text-muted" size={20} />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
