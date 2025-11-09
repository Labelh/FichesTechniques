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
    <header
      className="position-fixed top-0 start-0 end-0 bg-dark border-bottom shadow-sm"
      style={{
        zIndex: 1050,
        height: '64px',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(18, 18, 18, 0.95) !important'
      }}
    >
      <div className="container-fluid h-100">
        <div className="d-flex align-items-center h-100">
          {/* Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="me-3"
          >
            <Menu className="text-muted" size={22} />
          </Button>

          {/* Logo & Title */}
          <Link to="/" className="text-decoration-none d-flex align-items-center gap-2 me-auto">
            <div className="d-flex align-items-center justify-content-center rounded"
                 style={{
                   width: '36px',
                   height: '36px',
                   background: 'linear-gradient(135deg, #ff6b35 0%, #f44f1b 100%)',
                   boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)'
                 }}>
              <FileText className="text-white" size={20} />
            </div>
            <div>
              <h1 className="mb-0 fs-5 fw-bold text-white" style={{ letterSpacing: '-0.02em' }}>
                Fiches Techniques
              </h1>
              <p className="mb-0 text-muted" style={{ fontSize: '0.7rem', marginTop: '-2px' }}>
                Gestion de procédures
              </p>
            </div>
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
      </div>
    </header>
  );
}
