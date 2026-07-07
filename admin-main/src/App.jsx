import { useEffect, useState } from 'react';
import AdminLoginOverlay from './AdminLoginOverlay';
import AdminSidebar, { ADMIN_VIEWS } from './AdminSidebar';
import AdminOverviewView from './views/AdminOverviewView';
import QrCodesView from './views/QrCodesView';
import PVView from './views/PVView';
import UsersView from './views/UsersView';
import AnalyseView from './views/AnalyseView';
import { api } from './services/api';
import { startRealtime, stopRealtime } from './services/realtime';

const ADMIN_ACTIVE_VIEW_KEY = 'admin_active_view';
const ADMIN_VIEW_VALUES = new Set(Object.values(ADMIN_VIEWS));

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('admin_authenticated') === 'true'
  );
  const [activeView, setActiveView] = useState(() => {
    const storedView = sessionStorage.getItem(ADMIN_ACTIVE_VIEW_KEY);
    return ADMIN_VIEW_VALUES.has(storedView) ? storedView : ADMIN_VIEWS.DASHBOARD;
  });
  const [userProfileTarget, setUserProfileTarget] = useState(null);

  const handleLogin = () => {
    sessionStorage.setItem('admin_authenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem(ADMIN_ACTIVE_VIEW_KEY);
    api.logout();
    stopRealtime();
    setIsAuthenticated(false);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      stopRealtime();
      return undefined;
    }
    startRealtime();
    return () => stopRealtime();
  }, [isAuthenticated]);

  const handleNavigate = (view, payload = null) => {
    sessionStorage.setItem(ADMIN_ACTIVE_VIEW_KEY, view);
    setActiveView(view);
    setUserProfileTarget(view === ADMIN_VIEWS.USERS ? payload : null);
  };

  const renderView = () => {
    switch (activeView) {
      case ADMIN_VIEWS.DASHBOARD: return <AdminOverviewView onNavigate={handleNavigate} />;
      case ADMIN_VIEWS.QR: return <QrCodesView />;
      case ADMIN_VIEWS.PV: return <PVView />;
      case ADMIN_VIEWS.USERS: return <UsersView profileTarget={userProfileTarget} onProfileTargetHandled={() => setUserProfileTarget(null)} />;
      case ADMIN_VIEWS.ANALYSE: return <AnalyseView onNavigate={handleNavigate} />;
      default: return <AdminOverviewView onNavigate={handleNavigate} />;
    }
  };

  if (!isAuthenticated) {
    return <AdminLoginOverlay onLogin={handleLogin} />;
  }

  return (
    <>
      <AdminSidebar activeView={activeView} onSelectView={(view) => handleNavigate(view)} onLogout={handleLogout} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 pt-6">
          {renderView()}
        </div>
      </main>
    </>
  );
}
