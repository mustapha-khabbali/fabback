import { useCallback, useEffect, useState } from 'react';
import AdminLoginOverlay from './AdminLoginOverlay';
import AdminSidebar, { ADMIN_VIEWS } from './AdminSidebar';
import AdminOverviewView from './views/AdminOverviewView';
import QrCodesView from './views/QrCodesView';
import PVView from './views/PVView';
import UsersView from './views/UsersView';
import SignalementsView from './views/SignalementsView';
import AnalyseView from './views/AnalyseView';
import { api } from './services/api';
import { startRealtime, stopRealtime } from './services/realtime';

const ADMIN_ACTIVE_VIEW_KEY = 'admin_active_view';
const ADMIN_NAVIGATION_STATE_KEY = 'admin_navigation_state';
const ADMIN_VIEW_VALUES = new Set(Object.values(ADMIN_VIEWS));

function sanitizeView(view) {
  return ADMIN_VIEW_VALUES.has(view) ? view : ADMIN_VIEWS.DASHBOARD;
}

function normalizeProfileTarget(payload) {
  if (!payload) return null;
  return {
    id: payload.id || payload.userId || null,
    userId: payload.userId || payload.id || null,
    cin: payload.cin || null,
    email: payload.email || null,
    name: payload.name || `${payload.prenom || ''} ${payload.nom || ''}`.trim(),
    prenom: payload.prenom || null,
    nom: payload.nom || null
  };
}

function makeNavigationState(view, profileTarget = null) {
  const activeView = sanitizeView(view);
  return {
    adminNavigation: true,
    activeView,
    profileTarget: activeView === ADMIN_VIEWS.USERS ? normalizeProfileTarget(profileTarget) : null
  };
}

function readStoredNavigationState() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(ADMIN_NAVIGATION_STATE_KEY) || 'null');
    if (parsed?.adminNavigation) {
      return makeNavigationState(parsed.activeView, parsed.profileTarget);
    }
  } catch {
    // Ignore invalid stored navigation state.
  }

  return null;
}

function readInitialNavigationState() {
  if (window.history.state?.adminNavigation) {
    return makeNavigationState(window.history.state.activeView, window.history.state.profileTarget);
  }

  const storedNavigation = readStoredNavigationState();
  if (storedNavigation) return storedNavigation;

  return makeNavigationState(sessionStorage.getItem(ADMIN_ACTIVE_VIEW_KEY));
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('admin_authenticated') === 'true'
  );
  const [navigationState, setNavigationState] = useState(readInitialNavigationState);
  const { activeView, profileTarget: userProfileTarget } = navigationState;

  const applyNavigationState = useCallback((nextState) => {
    const resolvedState = makeNavigationState(nextState.activeView, nextState.profileTarget);
    sessionStorage.setItem(ADMIN_ACTIVE_VIEW_KEY, resolvedState.activeView);
    sessionStorage.setItem(ADMIN_NAVIGATION_STATE_KEY, JSON.stringify(resolvedState));
    setNavigationState(resolvedState);
    return resolvedState;
  }, []);

  const writeNavigationState = useCallback((view, profileTarget = null, mode = 'push') => {
    const resolvedState = applyNavigationState(makeNavigationState(view, profileTarget));
    if (mode === 'replace') {
      window.history.replaceState(resolvedState, '', window.location.href);
    } else {
      window.history.pushState(resolvedState, '', window.location.href);
    }
    return resolvedState;
  }, [applyNavigationState]);

  const handleLogin = () => {
    sessionStorage.setItem('admin_authenticated', 'true');
    setIsAuthenticated(true);
    writeNavigationState(activeView, userProfileTarget, 'replace');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem(ADMIN_ACTIVE_VIEW_KEY);
    sessionStorage.removeItem(ADMIN_NAVIGATION_STATE_KEY);
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

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    if (!window.history.state?.adminNavigation) {
      writeNavigationState(activeView, userProfileTarget, 'replace');
    }

    const handlePopState = (event) => {
      if (event.state?.adminNavigation) {
        applyNavigationState(event.state);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeView, applyNavigationState, isAuthenticated, userProfileTarget, writeNavigationState]);

  const handleNavigate = (view, payload = null) => {
    const targetView = sanitizeView(view);
    if (targetView === ADMIN_VIEWS.USERS && payload) {
      if (activeView !== ADMIN_VIEWS.USERS) {
        writeNavigationState(ADMIN_VIEWS.USERS);
      }
      writeNavigationState(ADMIN_VIEWS.USERS, payload);
      return;
    }

    writeNavigationState(targetView);
  };

  const handleUserProfileOpened = (user) => {
    writeNavigationState(ADMIN_VIEWS.USERS, user);
  };

  const handleUserProfileClosed = () => {
    writeNavigationState(ADMIN_VIEWS.USERS, null, 'replace');
  };

  const handleProfileTargetHandled = (user) => {
    if (!user) {
      writeNavigationState(ADMIN_VIEWS.USERS, null, 'replace');
    }
  };

  const renderView = () => {
    switch (activeView) {
      case ADMIN_VIEWS.DASHBOARD: return <AdminOverviewView onNavigate={handleNavigate} />;
      case ADMIN_VIEWS.QR: return <QrCodesView />;
      case ADMIN_VIEWS.PV: return <PVView />;
      case ADMIN_VIEWS.USERS: return (
        <UsersView
          profileTarget={userProfileTarget}
          onProfileOpened={handleUserProfileOpened}
          onProfileClosed={handleUserProfileClosed}
          onProfileTargetHandled={handleProfileTargetHandled}
        />
      );
      case ADMIN_VIEWS.SIGNALEMENTS: return <SignalementsView onNavigate={handleNavigate} />;
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
