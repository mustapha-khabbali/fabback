import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { mockProjects, mockUsers } from '../data/usersData';
import {
  createPresenceActivityEvent,
  savePresenceActivityEvent,
  PRESENCE_ACTIVITY_STORAGE_KEY
} from '../utils/presenceActivity';

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

  // We can derive currentScreen from the pathname if really needed, but mostly we just navigate
  const currentScreen = location.pathname === '/' ? SCREENS.HOME : location.pathname.replace('/', '');

  // Login tab
  const [activeTab, setActiveTab] = useState(TABS.SCAN);

  // User state
  const [currentUser, setCurrentUser] = useState({});
  const [pendingRole, setPendingRole] = useState('');
  const [selectedUser, setSelectedUser] = useState(null); // For viewing other profiles from Search
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic users list including on-the-fly created formateurs
  const [usersList, setUsersList] = useState(() => {
    try {
      const custom = JSON.parse(localStorage.getItem('custom_users') || '[]');
      return [...mockUsers, ...custom];
    } catch {
      return mockUsers;
    }
  });

  const addCustomUser = useCallback((newUser) => {
    setUsersList(prev => {
      const updated = [...prev, newUser];
      const customOnly = updated.filter(u => !mockUsers.some(mu => mu.id === u.id));
      localStorage.setItem('custom_users', JSON.stringify(customOnly));
      return updated;
    });
  }, []);
  const [searchFilter, setSearchFilter] = useState('ALL');
  const [previousTab, setPreviousTab] = useState(TABS.SEARCH);
  const [selectedNotificationRequest, setSelectedNotificationRequest] = useState(null);
  const [reviewingProject, setReviewingProject] = useState(null);

  const sendContactRequest = (targetUserId) => {
    const newNotif = {
      id: Date.now().toString(),
      type: 'CONTACT_REQUEST',
      requesterId: currentUser.id,
      requesterName: `${currentUser.prenom} ${currentUser.nom}`,
      requesterAvatar: currentUser.avatar,
      title: 'Demande de contact',
      message: `${currentUser.prenom} ${currentUser.nom} souhaite voir vos coordonnées.`,
      status: 'unread',
      targetId: targetUserId,
      createdAt: new Date().toISOString()
    };
    setNotifications([newNotif, ...notifications]);
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
    setNotifications(notifications.map(n => 
      n.id === notifId ? { ...n, status: 'read', handled: true, approved: approve } : n
    ));
  };

  const [navigationHistory, setNavigationHistory] = useState([]); // Array of { selectedUser, currentProjectId }
  const [directProgramView, setDirectProgramView] = useState(null); // { programId, returnToTab }
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-contact-req-demo',
      type: 'CONTACT_REQUEST',
      requesterId: 'user-2',
      requesterName: 'Jane Smith',
      requesterAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
      title: 'Demande de contact',
      message: 'Jane Smith souhaite voir vos coordonnées pour vous contacter.',
      status: 'unread',
      time: '15 min'
    },
    // Future admin-backed program notification.
    // Keep this full block for later when admin can create program launches.
    // {
    //   id: 'notif-program',
    //   type: 'program_launch',
    //   title: 'Nouveau programme disponible !',
    //   message: 'Rejoignez le Hackathon Innovation 2026 et montrez vos talents.',
    //   programId: 'prog-demo-1',
    //   time: 'Maintenant',
    //   status: 'unread'
    // },
    {
      id: 'notif-1',
      type: 'contribution_request',
      senderId: 'user-1',
      senderName: 'John Doe',
      projectTitle: 'Bras Articulé CMC',
      projectId: 'proj-1',
      description: "Salut ! J'ai vu ton projet de drone et je pense pouvoir t'aider sur la partie impression 3D du châssis.",
      time: 'Il y a 5 minutes',
      status: 'pending'
    },
    {
      id: 'notif-2',
      type: 'help_request',
      senderId: 'user-2',
      senderName: 'Jane Smith',
      projectTitle: 'Robot Solaire Autonome',
      projectId: 'proj-2',
      machineName: 'Coupe Laser',
      description: "J'ai besoin d'aide pour découper les pièces du châssis.",
      time: 'Il y a 10 minutes',
      status: 'pending',
      level: 4
    },
    {
      id: 'notif-3',
      type: 'help_feedback_request',
      senderId: 'user-1',
      senderName: 'John Doe',
      projectTitle: 'Bras Articulé CMC',
      projectId: 'proj-1',
      machineName: 'Imprimante 3D',
      time: 'Maintenant',
      status: 'pending'
    },
    {
      id: 'notif-4',
      type: 'review_request',
      senderId: 'user-2',
      senderName: 'Jane Smith',
      projectTitle: 'Robot Solaire Autonome',
      projectId: 'proj-2',
      description: "Mon prototype est terminé et prêt pour la validation finale.",
      time: 'Il y a 30 minutes',
      status: 'pending',
      level: 4
    },
    {
      id: 'notif-5',
      type: 'system',
      title: 'Bienvenue au Fab Lab !',
      message: 'Votre compte a été créé avec succès. Explorez nos outils.',
      time: 'Il y a 2 heures',
      status: 'read'
    }
  ]);

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
    console.log('[AppContext activeTab tracker] activeTab changed from', prevTabRef.current, 'to', activeTab);
    if (activeTab !== prevTabRef.current) {
      console.log('[AppContext activeTab tracker] Setting previousTab to', prevTabRef.current);
      setPreviousTab(prevTabRef.current);
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);
  const [recycleBin, setRecycleBin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recycle_bin') || '[]'); } catch { return []; }
  });
  const [currentProjectId, setCurrentProjectId] = useState(null);

  // Article management
  const [userArticles, setUserArticles] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user_articles') || '[]'); } catch { return []; }
  });

  // Modal states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showScanObjectiveModal, setShowScanObjectiveModal] = useState(false);
  const [showRoleScanObjectiveModal, setShowRoleScanObjectiveModal] = useState(false);
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

  // Project helpers with localStorage sync
  const saveProjects = useCallback((projects) => {
    setUserProjects(projects);
    localStorage.setItem('user_projects', JSON.stringify(projects));
  }, []);

  const saveRecycleBin = useCallback((bin) => {
    setRecycleBin(bin);
    localStorage.setItem('recycle_bin', JSON.stringify(bin));
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

    // Profile
    isProfileEditing,
    setIsProfileEditing,

    // Draft form
    registrationDraft,
    setRegistrationDraft,

    // Projects
    userProjects,
    saveProjects,
    allProjects: mockProjects,
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
