import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { useApp } from './context/AppContext';
import useBlockZoom from './hooks/useBlockZoom';
import LoginScreen from './components/dashboard/LoginScreen';

// Modals are lightweight and globally used, keep them static
import FeedbackModal from './components/modals/FeedbackModal';
import ScanObjectiveModal from './components/modals/ScanObjectiveModal';
import RoleScanObjectiveModal from './components/modals/RoleScanObjectiveModal';
import HelpFeedbackModal from './components/modals/HelpFeedbackModal';

// Lazy-loaded Screens for Code Splitting
const HomeScreen = lazy(() => import('./components/screens/HomeScreen'));
const RoleSelectionScreen = lazy(() => import('./components/screens/RoleSelectionScreen'));
const StagiaireScreen = lazy(() => import('./components/screens/StagiaireScreen'));
const RoleRegistrationScreen = lazy(() => import('./components/screens/RoleRegistrationScreen'));
const CharteScreen = lazy(() => import('./components/screens/CharteScreen'));

function ProtectedRoute({ children }) {
  const { currentUser } = useApp();
  // If no user is set, redirect to the home page
  if (!currentUser || Object.keys(currentUser).length === 0) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppContent() {
  const location = useLocation();
  const { notification, theme } = useApp();
  useBlockZoom();

  // Login screen fills full screen, other screens are centered on gradient
  const isFullScreen = location.pathname.startsWith('/login');
  const isRegistration = location.pathname === '/stagiaire' || location.pathname === '/role-registration';

  // Force light mode for onboarding screens
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isFullScreen ? theme : 'light');
  }, [isFullScreen, theme]);

  return (
    <>
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-center space-x-3 ${
            notification.type === 'error' 
              ? 'bg-red-50 border-red-100 text-red-600' 
              : 'bg-emerald-50 border-emerald-100 text-emerald-600'
          }`}>
            {notification.type === 'error' ? (
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            <span className="text-sm font-bold">{notification.message}</span>
          </div>
        </div>
      )}

      <div 
        className={
          isFullScreen
            ? 'main-container h-dvh w-full overflow-hidden'
            : isRegistration
              ? 'w-full h-dvh flex flex-col items-center justify-start pt-0 overflow-hidden'
              : 'w-full h-dvh flex flex-col items-center justify-center p-0 md:p-12 overflow-hidden'
        }
        style={!isFullScreen ? { background: 'linear-gradient(to bottom, #BDE3F2 0%, #E2F1F8 40%, #FFFFFF 100%)', color: '#133853' } : {}}
      >
        <Suspense fallback={<div className="flex items-center justify-center h-full w-full text-t-primary">Chargement...</div>}>
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/role-selection" element={<RoleSelectionScreen />} />
            <Route path="/stagiaire" element={<StagiaireScreen />} />
            <Route path="/role-registration" element={<RoleRegistrationScreen />} />
            <Route path="/charte" element={<CharteScreen />} />
            <Route path="/login/*" element={
              <ProtectedRoute>
                <LoginScreen />
              </ProtectedRoute>
            } />
            <Route path="*" element={<HomeScreen />} />
          </Routes>
        </Suspense>
      </div>

      {/* Global Modals */}
      <FeedbackModal />
      <ScanObjectiveModal />
      <RoleScanObjectiveModal />
      <HelpFeedbackModal />
    </>
  );
}


export default function App() {
  return <AppContent />;
}
