import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  createPresenceActivityEvent,
  savePresenceActivityEvent,
  PRESENCE_ACTIVITY_STORAGE_KEY
} from '../utils/presenceActivity';
import { ensureUserIdentity, mergeUserByIdentity, getPrimaryUserId } from '../utils/userIdentity';
import { api, getUserToken } from '../services/api';
import { startRealtime, stopRealtime, subscribeRealtime } from '../services/realtime';
import { useFirebase } from './FirebaseContext';

const AppContext = createContext(null);

// All possible screens in the app
export const SCREENS = {
  HOME: 'home',
  ROLE_SELECTION: 'role-selection',
  STAGIAIRE: 'stagiaire',
  ROLE_REGISTRATION: 'role-registration',
  CHARTE: 'charte',
  LOGIN: 'login',
};

// Login tab names
export const TABS = {
  FABLAB: 'fablab',
  SCAN: 'scan',
  NOTIFICATIONS: 'notifications',
  MY_PROJECT: 'my-project',
  PROFILE: 'profile',
  SEARCH: 'search',
  PROJECT_REVIEW: 'project-review',
};

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const firebase = useFirebase();

  // We can derive currentScreen from the pathname if really needed, but mostly we just navigate
  const currentScreen = location.pathname === '/' ? SCREENS.HOME : location.pathname.replace('/', '');

  // Login tab
  const [activeTab, setActiveTab] = useState(TABS.SCAN);

  // User state
  const [currentUser, setCurrentUserState] = useState(() => {
    try {
      return ensureUserIdentity(JSON.parse(localStorage.getItem('user_profile_data') || '{}')) || {};
    } catch {
      return {};
    }
  });
  const [pendingRole, setPendingRole] = useState('');
  const [selectedUser, setSelectedUser] = useState(null); // For viewing other profiles from Search
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic users list including on-the-fly created formateurs
  const [usersList, setUsersList] = useState(() => {
    try {
      const custom = JSON.parse(localStorage.getItem('custom_users') || '[]');
      return custom.map(ensureUserIdentity);
    } catch {
      return [];
    }
  });

  const persistUsers = useCallback((users) => {
    localStorage.setItem('custom_users', JSON.stringify(users));
  }, []);

  const addCustomUser = useCallback((newUser) => {
    setUsersList(prev => {
      const updated = mergeUserByIdentity(prev, newUser);
      persistUsers(updated);
      return updated;
    });
  }, [persistUsers]);

  const setCurrentUser = useCallback((nextUser) => {
    setCurrentUserState((prevUser) => {
      const resolved = typeof nextUser === 'function' ? nextUser(prevUser) : nextUser;
      const normalized = ensureUserIdentity(resolved) || {};

      if (normalized.id) {
        setUsersList((prevUsers) => {
          const updated = mergeUserByIdentity(prevUsers, normalized);
          persistUsers(updated);
          return updated;
        });
      }

      localStorage.setItem('user_profile_data', JSON.stringify(normalized));
      return normalized;
    });
  }, [persistUsers]);
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  const [searchFilter, setSearchFilter] = useState('ALL');
  const [previousTab, setPreviousTab] = useState(TABS.SEARCH);
  const [selectedNotificationRequest, setSelectedNotificationRequest] = useState(null);
  const [reviewingProject, setReviewingProject] = useState(null);

  const sendContactRequest = (targetUserId) => {
    const requesterId = getPrimaryUserId(currentUser);
    const newNotif = {
      type: 'CONTACT_REQUEST',
      requesterId,
      requesterName: `${currentUser.prenom} ${currentUser.nom}`,
      requesterAvatar: currentUser.avatar,
      title: 'Demande de contact',
      message: `${currentUser.prenom} ${currentUser.nom} souhaite voir vos coordonnées.`,
      status: 'unread',
      targetId: targetUserId,
      createdAt: new Date().toISOString()
    };
    api.createNotification(newNotif)
      .then((created) => setNotifications(prev => [...created, ...prev]))
      .catch(() => {});
    showNotification("Demande envoyée !");
  };

  const handleContactRequestResponse = (notifId, requesterId, approve) => {
    if (approve) {
      if (!allowedContactUsers.includes(requesterId)) {
        setAllowedContactUsers([...allowedContactUsers, requesterId]);
      }
      showNotification("Demande approuvée !");
    } else {
      showNotification("Demande refusée.");
    }
    api.updateNotification(notifId, { status: 'read', handled: true, approved: approve })
      .then((updated) => {
        setNotifications(notifications.map(n =>
          n.id === notifId ? updated : n
        ));
      })
      .catch(() => {
        setNotifications(notifications.map(n =>
          n.id === notifId ? { ...n, status: 'read', handled: true, approved: approve } : n
        ));
      });
  };

  const [navigationHistory, setNavigationHistory] = useState([]); // Array of { selectedUser, currentProjectId }
  const [directProgramView, setDirectProgramView] = useState(null); // { programId, returnToTab }
  const [notifications, setNotifications] = useState([]);

  // Lab presence state
  const [isUserInLab, setIsUserInLab] = useState(false);
  const [presenceActivityEvents, setPresenceActivityEvents] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PRESENCE_ACTIVITY_STORAGE_KEY) || '[]'); } catch { return []; }
  });

  // Feedback state
  const [currentRating, setCurrentRating] = useState(0);

  // Profile editing
  const [isProfileEditing, setIsProfileEditing] = useState(false);

  // Project management
  const [userProjects, setUserProjects] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user_projects') || '[]'); } catch { return []; }
  });

  // Settings state
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'light');
  const [isContactPublic, setIsContactPublic] = useState(() => localStorage.getItem('contact-privacy') === 'public');
  const [contactPrivacyMode, setContactPrivacyMode] = useState(() => localStorage.getItem('contact-privacy-mode') || 'private');
  const [allowedContactUsers, setAllowedContactUsers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('allowed-contact-users') || '[]'); } catch { return []; }
  });
  const [language, setLanguage] = useState(() => localStorage.getItem('app-language') || 'french');

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    if (location.pathname.startsWith('/login')) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme, location.pathname]);

  useEffect(() => {
    localStorage.setItem('contact-privacy-mode', contactPrivacyMode);
  }, [contactPrivacyMode]);

  useEffect(() => {
    localStorage.setItem('allowed-contact-users', JSON.stringify(allowedContactUsers));
  }, [allowedContactUsers]);

  useEffect(() => {
    localStorage.setItem('app-language', language);
    document.documentElement.setAttribute('lang', language === 'arabic' ? 'ar' : language === 'english' ? 'en' : 'fr');
  }, [language]);

  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (activeTab !== prevTabRef.current) {
      setPreviousTab(prevTabRef.current);
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);
  const [recycleBin, setRecycleBin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recycle_bin') || '[]'); } catch { return []; }
  });
  const [currentProjectId, setCurrentProjectId] = useState(null);

  const refreshUsers = useCallback((cancelledRef = { current: false }) => {
    api.getUsers()
      .then((users) => {
        if (!cancelledRef.current) {
          const normalizedUsers = users.map(ensureUserIdentity).filter(Boolean);
          setUsersList(normalizedUsers);
          persistUsers(normalizedUsers);
        }
      })
      .catch(() => {});
  }, [persistUsers]);

  const refreshProjects = useCallback((cancelledRef = { current: false }) => {
    Promise.all([api.getProjects(), api.getRecycleBin()])
      .then(([projects, bin]) => {
        if (cancelledRef.current) return;
        setUserProjects(projects);
        localStorage.setItem('user_projects', JSON.stringify(projects));
        setRecycleBin(bin);
        localStorage.setItem('recycle_bin', JSON.stringify(bin));
      })
      .catch(() => {});
  }, []);

  const refreshNotifications = useCallback((cancelledRef = { current: false }) => {
    api.getNotifications()
      .then((loadedNotifications) => {
        if (!cancelledRef.current) setNotifications(loadedNotifications);
      })
      .catch(() => {});
  }, []);

  const mergeRealtimeNotification = useCallback((change) => {
    if (!change.notification) return;
    setNotifications((currentNotifications) => {
      const withoutCurrent = currentNotifications.filter((notification) => notification.id !== change.notification.id);
      if (change.action === 'update') {
        return currentNotifications.map((notification) => (
          notification.id === change.notification.id ? change.notification : notification
        ));
      }
      return [change.notification, ...withoutCurrent];
    });
  }, []);

  const refreshOpenAttendance = useCallback((cancelledRef = { current: false }) => {
    api.getOpenAttendance()
      .then((openAttendance) => {
        if (!cancelledRef.current) setIsUserInLab(Boolean(openAttendance));
      })
      .catch(() => {});
  }, []);

  const refreshGateCache = useCallback(() => {
    api.getGateConfig()
      .then((gate) => {
        localStorage.setItem('gate_in_config', JSON.stringify(gate.config || {}));
        localStorage.setItem('gate_in_events', JSON.stringify(gate.events || []));
      })
      .catch(() => {});
  }, []);

  const refreshCurrentUser = useCallback((cancelledRef = { current: false }) => {
    const userId = getPrimaryUserId(currentUserRef.current);
    if (!userId) return;
    api.getUser(userId)
      .then((user) => {
        if (!cancelledRef.current) setCurrentUser(ensureUserIdentity(user));
      })
      .catch(() => {});
  }, [setCurrentUser]);

  useEffect(() => {
    if (!getUserToken()) return;
    const cancelledRef = { current: false };

    refreshUsers(cancelledRef);
    refreshProjects(cancelledRef);
    refreshNotifications(cancelledRef);
    refreshOpenAttendance(cancelledRef);
    refreshGateCache();

    return () => {
      cancelledRef.current = true;
    };
  }, [refreshGateCache, refreshNotifications, refreshOpenAttendance, refreshProjects, refreshUsers]);

  // Article management
  const [userArticles, setUserArticles] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user_articles') || '[]'); } catch { return []; }
  });

  // Modal states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showScanObjectiveModal, setShowScanObjectiveModal] = useState(false);
  const [showRoleScanObjectiveModal, setShowRoleScanObjectiveModal] = useState(false);
  const [pendingScanPayload, setPendingScanPayload] = useState(null);
  const [showHelpFeedbackModal, setShowHelpFeedbackModal] = useState(false);

  // Notification system
  const [notification, setNotification] = useState(null); // { message, type: 'error' | 'success' }

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Charte navigation memory
  const [charteReturnScreen, setCharteReturnScreen] = useState(SCREENS.STAGIAIRE);
  const [registrationDraft, setRegistrationDraft] = useState({});

  // Navigate to screen with transition
  const navigateTo = useCallback((screen) => {
    navigate(`/${screen === SCREENS.HOME ? '' : screen}`);
  }, [navigate]);

  // Navigate to charte, remembering where to return
  const goToCharte = useCallback((returnTo) => {
    setCharteReturnScreen(returnTo);
    navigate('/charte');
  }, [navigate]);

  const returnFromCharte = useCallback(() => {
    navigate(`/${charteReturnScreen}`);
  }, [navigate, charteReturnScreen]);

  // Show login and set default tab
  const showLogin = useCallback(() => {
    navigate('/login', { replace: true });
    setActiveTab(TABS.SCAN);
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = firebase.onAuthStateChanged(firebase.auth, (firebaseUser) => {
      if (!firebaseUser || !getUserToken()) return;

      api.getCurrentUser()
        .then((user) => {
          if (cancelled || !user) return;
          setCurrentUser(ensureUserIdentity(user));
          if (location.pathname === '/') {
            showLogin();
          }
        })
        .catch(() => {});
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [firebase, location.pathname, setCurrentUser, showLogin]);

  useEffect(() => {
    if (!getUserToken()) {
      stopRealtime();
      return undefined;
    }

    startRealtime();
    const unsubscribe = subscribeRealtime((change) => {
      const currentUserId = getPrimaryUserId(currentUserRef.current);
      if (change.entity === 'notifications') {
        mergeRealtimeNotification(change);
        refreshNotifications();
      }
      if (change.entity === 'projects') {
        refreshProjects();
      }
      if (change.entity === 'users') {
        refreshUsers();
        if (String(change.id) === String(currentUserId)) {
          if (change.action === 'deactivate') {
            api.logout();
            stopRealtime();
            setCurrentUser({});
            setIsUserInLab(false);
            showNotification('Votre compte est désactivé.', 'error');
            showLogin();
            return;
          }
          refreshCurrentUser();
        }
      }
      if (change.entity === 'attendance' && (!change.recipientId || String(change.recipientId) === String(currentUserId))) {
        refreshOpenAttendance();
      }
      if (change.entity === 'gate-config' || change.entity === 'events') {
        refreshGateCache();
      }
    });

    return () => {
      unsubscribe();
      stopRealtime();
    };
  }, [mergeRealtimeNotification, refreshCurrentUser, refreshGateCache, refreshNotifications, refreshOpenAttendance, refreshProjects, refreshUsers, setCurrentUser, showLogin, showNotification]);

  // Project helpers with localStorage sync
  const saveProjects = useCallback((projects) => {
    setUserProjects(projects);
    localStorage.setItem('user_projects', JSON.stringify(projects));
    api.syncProjects(projects)
      .then((savedProjects) => {
        setUserProjects(savedProjects);
        localStorage.setItem('user_projects', JSON.stringify(savedProjects));
      })
      .catch(() => {});
  }, []);

  const saveRecycleBin = useCallback((bin) => {
    setRecycleBin(bin);
    localStorage.setItem('recycle_bin', JSON.stringify(bin));
    api.syncRecycleBin(bin)
      .then((savedBin) => {
        setRecycleBin(savedBin);
        localStorage.setItem('recycle_bin', JSON.stringify(savedBin));
      })
      .catch(() => {});
  }, []);

  const saveArticles = useCallback((articles) => {
    setUserArticles(articles);
    localStorage.setItem('user_articles', JSON.stringify(articles));
  }, []);

  const recordPresenceActivity = useCallback((type, metadata = {}) => {
    const event = createPresenceActivityEvent(currentUser, type, {
      ...metadata,
      insideLabAtAction: isUserInLab
    });
    const updated = savePresenceActivityEvent(event);
    setPresenceActivityEvents(updated);
    return event;
  }, [currentUser, isUserInLab]);

  const value = {
    // Screen navigation
    currentScreen,
    navigateTo,
    goToCharte,
    returnFromCharte,
    showLogin,

    // Login tabs
    activeTab,
    setActiveTab,

    // User
    currentUser,
    setCurrentUser,
    pendingRole,
    setPendingRole,
    selectedUser,
    setSelectedUser,
    searchQuery,
    setSearchQuery,
    searchFilter,
    setSearchFilter,
    usersList,
    addCustomUser,

    // Lab state
    isUserInLab,
    setIsUserInLab,
    presenceActivityEvents,
    recordPresenceActivity,

    // Feedback
    currentRating,
    setCurrentRating,
    showFeedbackModal,
    setShowFeedbackModal,
    showHelpFeedbackModal,
    setShowHelpFeedbackModal,

    // Scan modals
    showScanObjectiveModal,
    setShowScanObjectiveModal,
    showRoleScanObjectiveModal,
    setShowRoleScanObjectiveModal,
    pendingScanPayload,
    setPendingScanPayload,

    // Profile
    isProfileEditing,
    setIsProfileEditing,

    // Draft form
    registrationDraft,
    setRegistrationDraft,

    // Projects
    userProjects,
    saveProjects,
    allProjects: userProjects,
    recycleBin,
    saveRecycleBin,
    currentProjectId,
    setCurrentProjectId,

    // Articles
    userArticles,
    saveArticles,

    // Notifications
    notification,
    showNotification,

    // Navigation History
    previousTab,
    setPreviousTab,
    selectedNotificationRequest,
    setSelectedNotificationRequest,
    reviewingProject,
    setReviewingProject,
    navigationHistory,
    setNavigationHistory,
    directProgramView,
    setDirectProgramView,
    notifications,
    setNotifications,
    sendContactRequest,
    handleContactRequestResponse,
    theme,
    setTheme,
    isContactPublic,
    setIsContactPublic,
    contactPrivacyMode,
    setContactPrivacyMode,
    allowedContactUsers,
    setAllowedContactUsers,
    language,
    setLanguage
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
