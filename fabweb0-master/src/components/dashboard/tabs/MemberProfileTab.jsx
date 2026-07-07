import { useState, useRef, useEffect } from 'react';
import { useApp, TABS } from '../../../context/AppContext';
import JournalReaderModal from '../project/JournalReaderModal';
import { buildPresenceHeatmapCells } from '../../../utils/presenceActivity';
import { findUserByIdentity, getPrimaryUserId, isCurrentUserId } from '../../../utils/userIdentity';
import ImageLightbox from '../../common/ImageLightbox';
import { api } from '../../../services/api';

const JOURNAL_COLORS = ['#FF6B6B', '#4ECDC4', '#3B5FE6', '#FF9F43', '#10AC84', '#EE5253', '#5F27CD', '#222F3E'];

const ALL_SDGS = Array.from({ length: 17 }, (_, i) => ({
  id: `sdg-${i + 1}`,
  number: i + 1,
  image: `/sdg/${i + 1}_result.webp`
}));

const SHOW_PROFILE_LEVEL_BADGE = false;

function formatProgramDate(program) {
  if (program.dateMode === 'range') {
    if (program.dateFrom && program.dateTo) return `Du ${program.dateFrom} au ${program.dateTo}`;
    if (program.dateFrom) return `Depuis ${program.dateFrom}`;
    if (program.dateTo) return `Jusqu'au ${program.dateTo}`;
    return '';
  }
  return program.date || '';
}

export default function MemberProfileTab() {
  const { currentUser, setSelectedUser, selectedUser, setActiveTab, allProjects, userProjects, showNotification, previousTab, currentProjectId, setCurrentProjectId, navigationHistory, setNavigationHistory, sendContactRequest, presenceActivityEvents, usersList, contactPrivacyMode, allowedContactUsers, isUserInLab, attendanceRefreshKey } = useApp();

  const [viewingProjects, setViewingProjects] = useState(false);
  const [viewingProjectDetailId, setViewingProjectDetailId] = useState(null);
  const [activeJournal, setActiveJournal] = useState(null);
  const [showJournalReader, setShowJournalReader] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Contribution Workflow
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [contributionText, setContributionText] = useState('');
  const displayUser = selectedUser || currentUser;
  const isStagiaire = displayUser?.role === 'stagiaire';
  const containerRef = useRef(null);
  const [selectedProgramType, setSelectedProgramType] = useState(null);

  // Recognition Feature State
  const [showRecognitionModal, setShowRecognitionModal] = useState(false);
  const [recognitionComment, setRecognitionComment] = useState('');
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [recognitionRating, setRecognitionRating] = useState(0);

  // Report Feature State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [attendanceRows, setAttendanceRows] = useState([]);

  const RECOGNITION_MACHINES = ['Imprimante 3D', 'Scanner 3D', 'Coupe Laser', 'Assemblage', 'Électronique'];
  const currentUserId = getPrimaryUserId(currentUser);
  const displayUserId = getPrimaryUserId(displayUser);
  const isOwnProfile = isCurrentUserId(currentUser, displayUserId);
  const findUserById = (userId) => findUserByIdentity(usersList, userId, currentUser);
  const heatmapCells = buildPresenceHeatmapCells(displayUser, presenceActivityEvents, attendanceRows);

  // Refs to avoid stale closures in handleBack
  const navHistoryRef = useRef(navigationHistory);
  const previousTabRef = useRef(previousTab);

  useEffect(() => {
    navHistoryRef.current = navigationHistory;
  }, [navigationHistory]);

  useEffect(() => {
    previousTabRef.current = previousTab;
  }, [previousTab]);

  useEffect(() => {
    if (!displayUserId) {
      setAttendanceRows([]);
      return undefined;
    }

    let cancelled = false;
    api.getUserAttendance(displayUserId)
      .then((rows) => {
        if (!cancelled) setAttendanceRows(rows);
      })
      .catch(() => {
        if (!cancelled) setAttendanceRows([]);
      });

    return () => {
      cancelled = true;
    };
  }, [displayUserId, isOwnProfile, isUserInLab, attendanceRefreshKey]);

  // Handle deep-link to project from notification
  useEffect(() => {
    if (currentProjectId && !selectedUser) {
      setViewingProjects(true);
      setViewingProjectDetailId(currentProjectId);
    }
  }, [currentProjectId, selectedUser]);

  const handleBack = () => {
    const history = navHistoryRef.current;
    if (history.length > 0) {
      const last = history[history.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));

      if (last.fromTab) {
        if (last.currentProjectId) {
          setCurrentProjectId(last.currentProjectId);
        }
        setSelectedUser(last.selectedUser);
        setActiveTab(last.fromTab);
      } else {
        setSelectedUser(last.selectedUser);
        if (last.currentProjectId) {
          setViewingProjects(true);
          setViewingProjectDetailId(last.currentProjectId);
          setCurrentProjectId(last.currentProjectId);
        } else {
          setViewingProjects(false);
          setViewingProjectDetailId(null);
          setCurrentProjectId(null);
        }
      }
      return;
    }
    setCurrentProjectId(null);
    setSelectedUser(null);
    setActiveTab(previousTabRef.current || TABS.SEARCH);
  };

  const handleMemberClick = (user, projectId) => {
    setNavigationHistory(prev => [...prev, { selectedUser, currentProjectId: projectId }]);
    setSelectedUser(user);
    setViewingProjects(false);
    setViewingProjectDetailId(null);
  };

  const getProgramColor = (count) => {
    if (count === 1) return 'bg-amber-50 text-amber-600 border-amber-200 shadow-amber-100/50';
    if (count === 2) return 'bg-orange-50 text-orange-600 border-orange-200 shadow-orange-100/50';
    if (count === 3) return 'bg-rose-50 text-rose-600 border-rose-200 shadow-rose-100/50';
    if (count === 4) return 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-indigo-100/50';
    return 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-100/50'; // 5+
  };

  const roleLabel = displayUser?.role ? displayUser.role.charAt(0).toUpperCase() + displayUser.role.slice(1) : 'Stagiaire';

  return (
    <div
      ref={containerRef}
      className="flex flex-col p-6 space-y-6 overflow-y-auto custom-scrollbar pt-12 pb-24 h-full"
    >
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="absolute top-12 left-6 p-2 bg-t-surface glass-card rounded-xl text-[#3B5FE6] shadow-sm active:scale-90 transition-transform z-10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Profile Header */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => displayUser.avatar && setLightboxImage(displayUser.avatar)}
            disabled={!displayUser.avatar}
            className="w-32 h-32 bg-t-surface glass-card rounded-full border-2 border-[#3B5FE6] flex items-center justify-center overflow-hidden shadow-2xl transition-transform active:scale-95 disabled:cursor-default"
          >
            {displayUser.avatar ? (
              <img src={displayUser.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-t-primary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        <div className="text-center space-y-2">
          <div className="text-2xl font-bold text-t-primary">{displayUser?.prenom} {displayUser?.nom}</div>
          <p className="text-t-tertiary font-bold text-sm uppercase tracking-widest">{roleLabel}</p>

          <div className="flex flex-col items-center space-y-3 pt-2">
            {SHOW_PROFILE_LEVEL_BADGE && isStagiaire && (
              <div className="bg-emerald-50 px-4 py-1.5 rounded-full flex items-center space-x-2 border border-emerald-100 shadow-sm">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  Level {Math.floor((displayUser?.points || 0) / 200) + 1}
                </span>
              </div>
            )}

            {/* Actions Trigger (Heart & Dislike Icons) */}
            {!isOwnProfile && isStagiaire && (
              <div className="flex items-center space-x-4">
                {/* Recognition Trigger */}
                <button
                  onClick={() => setShowRecognitionModal(true)}
                  className="p-3 bg-t-surface glass-card rounded-2xl shadow-sm text-rose-500 hover:text-rose-600 active:scale-95 transition-all border border-rose-50 hover:bg-rose-50 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-rose-500/0 group-hover:bg-rose-500/5 transition-colors"></div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transition-all group-hover:scale-110 group-hover:fill-current relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>

                {/* Report Trigger */}
                <button
                  onClick={() => setShowReportModal(true)}
                  className="p-3 bg-t-surface glass-card rounded-2xl shadow-sm text-gray-400 hover:text-t-primary active:scale-95 transition-all border border-t-border-subtle hover:bg-t-surface-alt group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4l-1 4 2 3-2 3 1 4" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Sections */}
      <div className="space-y-8 pt-4">
        {/* ATTENDANCE HEATMAP SECTION */}
        {isStagiaire && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold text-t-tertiary uppercase tracking-widest">Présence au Fab Lab</h4>
              <span className="text-[10px] font-bold text-[#3B5FE6] bg-blue-50 px-2 py-0.5 rounded-full">30 derniers jours</span>
            </div>
            <div className="bg-t-surface glass-card p-4 rounded-[32px] shadow-sm border border-t-border-subtle flex items-center justify-center overflow-hidden">
              <div className="grid grid-cols-[repeat(30,1fr)] gap-[2px] w-full aspect-[30/10]">
                {heatmapCells.map((cell) => {
                  return (
                    <div key={cell.key} className={`rounded-[1px] transition-all duration-500 hover:scale-125 hover:z-10 cursor-pointer ${cell.colorClass}`} title={cell.title} />
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-end px-2 pt-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold text-t-tertiary">Moins</span>
                <div className="flex space-x-[2px]">
                  <div className="w-[10px] h-[10px] rounded-[1px] bg-[#ebedf0]/40"></div>
                  <div className="w-[10px] h-[10px] rounded-[1px] bg-[#9be9a8]"></div>
                  <div className="w-[10px] h-[10px] rounded-[1px] bg-[#40c463]"></div>
                  <div className="w-[10px] h-[10px] rounded-[1px] bg-[#30a14e]"></div>
                  <div className="w-[10px] h-[10px] rounded-[1px] bg-[#216e39]"></div>
                </div>
                <span className="text-[10px] font-bold text-t-tertiary">Plus</span>
              </div>
            </div>
          </div>
        )}

        {/* BIO Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-t-tertiary uppercase tracking-widest px-1">À propos</h4>
          <div className="bg-t-surface glass-card p-5 rounded-2xl shadow-sm border border-t-border-subtle group">
            <div className="flex items-center space-x-3 mb-2">
              <div className="text-[#3B5FE6]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-t-tertiary uppercase">Bio</span>
            </div>
            <div className="text-sm font-medium text-t-primary leading-relaxed">
              {displayUser?.bio || "Passionné par le Fab Lab et l'innovation technologique."}
            </div>
          </div>
        </div>

        {/* ACADEMIC Section (Stagiaire only) */}
        {isStagiaire && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-t-tertiary uppercase tracking-widest px-1">Parcours Académique</h4>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-t-surface glass-card p-4 rounded-2xl shadow-sm border border-t-border-subtle flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-[#3B5FE6]"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div>
                  <span className="text-[10px] font-bold text-t-tertiary uppercase">Pôle</span>
                </div>
                <div className="text-sm font-bold text-t-primary">{displayUser?.pole || '-'}</div>
              </div>
              <div className="bg-t-surface glass-card p-4 rounded-2xl shadow-sm border border-t-border-subtle flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-[#3B5FE6]"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                  <span className="text-[10px] font-bold text-t-tertiary uppercase">Niveau</span>
                </div>
                <div className="text-sm font-bold text-t-primary">{displayUser?.niveau || '-'}</div>
              </div>
              <div className="bg-t-surface glass-card p-4 rounded-2xl shadow-sm border border-t-border-subtle group">
                <div className="flex items-center space-x-3 mb-1">
                  <div className="text-[#3B5FE6]"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
                  <span className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest">Filière</span>
                </div>
                <div className="text-sm font-bold text-t-primary leading-tight">{displayUser?.filiere || '-'}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-t-surface glass-card p-4 rounded-2xl shadow-sm border border-t-border">
                  <p className="text-[10px] font-bold text-t-tertiary uppercase">Année</p>
                  <div className="text-sm font-bold text-t-primary mt-0.5">{displayUser?.year || '-'}</div>
                </div>
                {displayUser?.option && displayUser.option !== 'N' && (
                  <div className="bg-t-surface glass-card p-4 rounded-2xl shadow-sm border border-t-border">
                    <p className="text-[10px] font-bold text-t-tertiary uppercase">Option</p>
                    <div className="text-sm font-bold text-t-primary mt-0.5">{displayUser.option}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Parked: Expertise Machines — re-enable when expertise is computed from real
            help data (approved helps per machine).
        MACHINES Section
        {isStagiaire && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-t-tertiary uppercase tracking-widest px-1">Expertise Machines</h4>
            <div className="bg-t-surface glass-card p-5 rounded-[32px] shadow-sm border border-t-border space-y-4">
              {(displayUser?.machines || [
                { name: 'Impression 3D', level: 'Expert', color: 'bg-emerald-500' },
                { name: 'Découpe Laser', level: 'Intermédiaire', color: 'bg-blue-500' },
                { name: 'Arduino', level: 'Débutant', color: 'bg-amber-500' }
              ]).map((m, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${m.color || 'bg-gray-400'}`}></div>
                    <span className="text-[13px] font-bold text-t-primary">{m.name}</span>
                  </div>
                  <div className={`${m.color || 'bg-gray-400'} w-12 h-2.5 rounded-full`}></div>
                </div>
              ))}
            </div>
          </div>
        )}
        */}

        {/* PROGRAMS Section */}
        {isStagiaire && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-t-tertiary uppercase tracking-widest px-1">Programmes</h4>
            <div className="bg-t-surface glass-card p-5 rounded-[32px] shadow-sm border border-t-border space-y-4">
              <div className="flex flex-wrap gap-2">
                {displayUser?.programs?.length > 0 ? (
                  displayUser.programs.map((program, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedProgramType(program)}
                      className={`inline-flex max-w-full px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all active:scale-95 ${getProgramColor(idx + 1)} shadow-sm`}
                    >
                      <span className="truncate">{program.name}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-[11px] text-t-muted font-bold italic px-1">Aucun programme sélectionné</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PROJECTS Section */}
        {isStagiaire && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-t-tertiary uppercase tracking-widest px-1">Projets</h4>
            <button
              onClick={() => setViewingProjects(true)}
              className="w-full bg-t-surface glass-card p-5 rounded-[32px] shadow-sm border border-t-border flex items-center justify-between group active:scale-[0.98] transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="relative w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
                  {/* Gears in background */}
                  <div className="absolute top-1 right-1 text-amber-300 opacity-60 animate-[spin_8s_linear_infinite]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <div className="absolute bottom-2 left-2 text-amber-200 opacity-40 animate-[spin_12s_linear_infinite_reverse]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  {/* Lightbulb in front */}
                  <div className="relative z-10 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1zM9 19h6v1H9v-1zm0 2h6v1H9v-1z" />
                    </svg>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-t-primary uppercase tracking-tight">Voir les projets</p>
                  <div className="h-1 w-8 bg-amber-400 rounded-full mt-1"></div>
                </div>
              </div>
              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-[#3B5FE6] group-hover:translate-x-1 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </div>
            </button>
          </div>
        )}

        {/* CONTACT Section */}
        {(() => {
          let canSeeContacts = false;
          if (isOwnProfile) {
            canSeeContacts = true;
          } else {
            // Logic for viewing others:
            // Since we don't have a real backend for others' privacy, use the target profile fields.
            // But if the user being viewed is the currentUser (e.g. from search), use global settings.
            const targetPrivacyMode = isCurrentUserId(currentUser, displayUserId) ? contactPrivacyMode : (displayUser.privacyMode || 'private');
            const targetAllowedList = isCurrentUserId(currentUser, displayUserId) ? allowedContactUsers : (displayUser.allowedUsers || []);
            
            if (targetPrivacyMode === 'public') {
              canSeeContacts = true;
            } else if (targetPrivacyMode === 'personalised') {
              canSeeContacts = targetAllowedList.map(String).includes(String(currentUserId));
            }
          }

          if (!canSeeContacts) {
            return !isOwnProfile ? (
              <div className="px-2">
                <button 
                  onClick={() => sendContactRequest(displayUserId)}
                  className="w-full flex items-center justify-between p-6 bg-t-surface glass-card rounded-[32px] border-2 border-[#3B5FE6]/10 hover:border-[#3B5FE6] hover:bg-blue-50/30 transition-all active:scale-[0.98] group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#3B5FE6]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-t-primary uppercase tracking-tight">Demander le contact</p>
                      <p className="text-[10px] text-t-muted font-bold uppercase tracking-widest mt-0.5">Pour voir son email et téléphone</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-[#3B5FE6] group-hover:translate-x-1 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>
              </div>
            ) : null;
          }

          return (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-t-tertiary uppercase tracking-widest px-1">Contact</h4>
              <div className="bg-t-surface glass-card p-1 rounded-3xl shadow-sm border border-t-border divide-y divide-gray-50">
                <div className="p-4 flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-50 text-[#3B5FE6] rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-t-tertiary uppercase">Email</p>
                    <div className="text-sm font-bold text-t-primary leading-tight lowercase">{displayUser?.email || '-'}</div>
                  </div>
                </div>
                <div className="p-4 flex items-center space-x-4">
                  <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-t-tertiary uppercase">Téléphone</p>
                    <div className="text-sm font-bold text-t-primary leading-tight">{displayUser?.tel || '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      </div>

      {/* Program Detail Modal */}
      {selectedProgramType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-midnight-blue/60 backdrop-blur-sm">
          <div className="bg-t-surface glass-card w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="relative p-8 pt-12 text-center space-y-4 shrink-0">
              <button
                onClick={() => setSelectedProgramType(null)}
                className="absolute top-6 right-6 p-2 bg-t-surface-alt rounded-full text-t-muted hover:text-t-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto text-[#3B5FE6]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-t-primary leading-tight uppercase tracking-tighter">{selectedProgramType.name}</h3>
                <p className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest">{selectedProgramType.type}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 pb-4 space-y-3 custom-scrollbar">
              <div className="p-4 bg-[#F0F7FF] rounded-2xl border border-blue-50 space-y-3">
                {selectedProgramType.image && <img src={selectedProgramType.image} alt="" className="w-full h-36 object-cover rounded-2xl border border-blue-100" />}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-t-primary truncate">{selectedProgramType.name}</p>
                  <span className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${selectedProgramType.result === 'Win' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    {selectedProgramType.result}
                  </span>
                </div>
                {(selectedProgramType.description || formatProgramDate(selectedProgramType)) && (
                  <div className="space-y-1">
                    {selectedProgramType.description && <p className="text-[11px] text-t-secondary font-medium leading-relaxed">{selectedProgramType.description}</p>}
                    {formatProgramDate(selectedProgramType) && <p className="text-[10px] text-t-tertiary font-bold uppercase tracking-widest">{formatProgramDate(selectedProgramType)}</p>}
                  </div>
                )}
              </div>
            </div>
            <div className="p-8 pt-0 shrink-0">
              <button
                onClick={() => setSelectedProgramType(null)}
                className="w-full py-4 bg-midnight-blue text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingProjects && (() => {
        const selectedProject = allProjects?.find(p => p.id === viewingProjectDetailId);
        const groupedJournals = {};
        const phaseOrder = ['MOC', 'POC', 'MVP', 'READY_TO_MARKET'];
        if (selectedProject) {
          (selectedProject.journals || []).forEach(j => {
            let p = j.phase || 'MOC';
            if (p === 'IDEA') p = 'MOC';
            if (p === 'PROTOTYPING') p = 'POC';
            if (!groupedJournals[p]) groupedJournals[p] = [];
            groupedJournals[p].push(j);
          });
        }
        return (
          <div className="fixed inset-0 z-[150] main-container flex flex-col animate-in slide-in-from-right duration-500">
            {selectedProject ? (
              /* PROJECT DETAIL VIEW */
              <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pt-4 px-2 shrink-0">
                  <button
                    onClick={() => {
                      if (navigationHistory.length > 0) {
                        handleBack();
                        return;
                      }
                      if (previousTab === TABS.NOTIFICATIONS) {
                        setViewingProjectDetailId(null);
                        setCurrentProjectId(null);
                        setSelectedUser(null);
                        setActiveTab(TABS.NOTIFICATIONS);
                      } else {
                        setViewingProjectDetailId(null);
                        setCurrentProjectId(null);
                      }
                    }}
                    className="p-2 text-t-tertiary hover:text-t-primary transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                  </button>

                  <div className="flex-1 flex flex-col items-center min-w-0 mx-4">
                    <h2 className="text-xl font-bold text-t-primary text-center truncate w-full lg:text-4xl lg:tracking-tight">{selectedProject.title}</h2>
                    <div className="mt-1.5 flex items-center space-x-1.5 animate-in fade-in slide-in-from-top-2 duration-700 delay-300">
                      <div className="px-3 py-1.5 rounded-2xl bg-t-surface-alt border border-t-border/50 shadow-sm text-[9px] font-black text-[#3B5FE6] uppercase tracking-wider">
                        {((selectedProject.phase === 'IDEA' || !selectedProject.phase) ? 'MOC' : (selectedProject.phase === 'PROTOTYPING' ? 'POC' : selectedProject.phase)).replace(/_/g, ' ')}
                      </div>

                      {/* SDG Logos */}
                      {selectedProject.sdgIds && selectedProject.sdgIds.length > 0 && (
                        <div className="flex items-center space-x-1.5 pl-2 border-l border-t-border-strong">
                          {selectedProject.sdgIds.map(id => {
                            const sdg = ALL_SDGS.find(s => s.id === id);
                            if (!sdg) return null;
                            return (
                              <div
                                key={id}
                                className="w-6 h-6 rounded-[2px] overflow-hidden shadow-md shrink-0"
                                title={`SDG ${sdg.number}`}
                              >
                                <img src={sdg.image} className="w-full h-full object-cover" alt={`SDG ${sdg.number}`} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="p-2 text-t-secondary hover:text-t-primary transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                    </button>
                    {/* Dropdown Menu */}
                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-[150]" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}></div>
                        <div className="absolute top-10 right-0 w-56 bg-t-surface glass-card border border-t-border rounded-2xl shadow-2xl z-[160] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpen(false);
                              setShowContributionModal(true);
                            }}
                            className="w-full p-4 text-left text-sm font-bold text-t-primary hover:bg-blue-50 flex items-center space-x-3 transition-colors"
                          >
                            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-[#3B5FE6]">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            </div>
                            <span>Demander à contribuer</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Project Info */}
                <div className="bg-t-surface glass-card rounded-[32px] p-6 shadow-sm border border-t-border space-y-4">
                  {selectedProject.image && (
                    <div className="w-full h-48 rounded-2xl overflow-hidden shadow-sm">
                      <img src={selectedProject.image} className="w-full h-full object-cover" alt="Project" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <h3 className="text-[10px] font-bold text-t-muted uppercase tracking-[0.2em]">Description</h3>
                    <div
                      className="text-sm text-t-primary/80 font-medium leading-relaxed break-words overflow-wrap-anywhere rich-text-content"
                      dangerouslySetInnerHTML={{ __html: selectedProject.description }}
                    />
                  </div>
                </div>

                {/* Team Section (Read-only) */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-t-muted uppercase tracking-[0.2em] px-2">L'Équipe</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Founder */}
                    {(() => {
                      const u = findUserById(selectedProject.userId);
                      const colors = ['#FF6B6B', '#4ECDC4', '#3B5FE6', '#FF9F43', '#10AC84'];
                      return (
                        <button 
                          onClick={() => handleMemberClick(u, selectedProject.id)}
                          className="flex items-center space-x-3 p-3 bg-t-surface glass-card rounded-2xl border border-t-border-subtle text-left transition-all active:scale-95 shadow-sm"
                        >
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-sm shrink-0 uppercase"
                            style={{ backgroundColor: colors[0] }}
                          >
                            {u?.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover rounded-lg" /> : <span>{u?.prenom?.[0] || '?'}</span>}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[11px] font-bold text-t-primary truncate">{u?.prenom} {u?.nom}</h4>
                            <p className="text-[7px] font-black text-t-muted uppercase tracking-widest">Fondateur</p>
                          </div>
                        </button>
                      );
                    })()}
                    
                    {/* Contributors */}
                    {(selectedProject.contributors || []).map((c, idx) => {
                      const u = findUserById(c.userId);
                      const colors = ['#FF6B6B', '#4ECDC4', '#3B5FE6', '#FF9F43', '#10AC84'];
                      return (
                        <button 
                          key={c.userId} 
                          onClick={() => handleMemberClick(u, selectedProject.id)}
                          className="flex items-center space-x-3 p-3 bg-t-surface glass-card rounded-2xl border border-t-border-subtle text-left transition-all active:scale-95 shadow-sm"
                        >
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-sm shrink-0 uppercase"
                            style={{ backgroundColor: colors[(idx + 1) % colors.length] }}
                          >
                            {u?.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover rounded-lg" /> : <span>{u?.prenom?.[0] || '?'}</span>}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[11px] font-bold text-t-primary truncate">{u?.prenom} {u?.nom}</h4>
                            <p className="text-[7px] font-black text-t-muted uppercase tracking-widest">{c.role}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Supervisors Section (Read-only) */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-t-muted uppercase tracking-[0.2em] px-2">Encadrants</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => showNotification("Sara Ladouy est la Responsable du Fab Lab.")}
                      className="flex items-center space-x-3 p-3 bg-[#3B5FE6] rounded-2xl border border-transparent text-left transition-all active:scale-95 shadow-sm text-white"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-[#3B5FE6] bg-t-surface glass-card shadow-sm shrink-0 uppercase">
                        S
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[11px] font-bold text-white truncate">Sara Ladouy</h4>
                        <p className="text-[7px] font-black text-white/70 uppercase tracking-widest">Responsable Fab Lab</p>
                      </div>
                    </button>

                    {(selectedProject.supervisorIds || [])
                      .filter(id => id !== 'user-sara' && id !== 'system-sara')
                      .map((supervisorId) => {
                        const supervisor = findUserById(supervisorId);
                        if (!supervisor) return null;
                        return (
                          <button
                            key={supervisorId}
                            onClick={() => handleMemberClick(supervisor, selectedProject.id)}
                            className="flex items-center space-x-3 p-3 bg-[#3B5FE6] rounded-2xl border border-transparent text-left transition-all active:scale-95 shadow-sm text-white"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-[#3B5FE6] bg-t-surface glass-card shadow-sm shrink-0 uppercase">
                              {supervisor.avatar ? <img src={supervisor.avatar} alt="" className="w-full h-full object-cover rounded-lg" /> : <span>{supervisor.prenom?.[0] || '?'}</span>}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-[11px] font-bold text-white truncate">{supervisor.prenom} {supervisor.nom}</h4>
                              <p className="text-[7px] font-black text-white/70 uppercase tracking-widest truncate">{supervisor.role || 'Encadrant'}</p>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Journal Section */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-t-muted uppercase tracking-[0.2em] px-2">Journaux</h3>
                  {(!selectedProject.journals || selectedProject.journals.length === 0) ? (
                    <div className="text-center py-6 text-t-muted italic text-sm">Aucun journal</div>
                  ) : (
                    <div className="space-y-6">
                      {phaseOrder.filter(phaseKey => groupedJournals[phaseKey] && groupedJournals[phaseKey].length > 0).map(phaseKey => (
                        <div key={phaseKey} className="space-y-2.5">
                          <div className="flex items-center space-x-1.5 border-b border-t-border pb-0.5 px-2">
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">
                              {phaseKey.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[9px] font-bold text-t-muted">
                              ({groupedJournals[phaseKey].length})
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-x-4 gap-y-6">
                            {groupedJournals[phaseKey].map((j, idx) => (
                              <button
                                key={j.id}
                                onClick={() => {
                                  setActiveJournal(j);
                                  setShowJournalReader(true);
                                }}
                                className="flex flex-col items-center space-y-2 transition-all active:scale-95 group"
                              >
                                <div className="w-full aspect-square rounded-[20px] shadow-md flex items-center justify-center group-hover:rotate-2 transition-transform" style={{ backgroundColor: JOURNAL_COLORS[idx % JOURNAL_COLORS.length] }}>
                                  <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M7 9H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M7 14H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </div>
                                <span className="text-[9px] font-bold text-t-secondary text-center uppercase tracking-tighter">
                                  {new Date(j.date || j.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                </span>
                                {j.version && (
                                  <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider scale-95 mt-0.5">
                                    v{j.version}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* DOSSIER HOME VIEW (Same as ProjectHome.jsx) */
              <div className="flex flex-col h-full overflow-hidden">
                <div className="sticky top-0 z-20 main-container pt-12 pb-4 px-6 shrink-0 border-b border-t-border/50 flex items-center space-x-4">
                  <button
                    onClick={() => setViewingProjects(false)}
                    className="p-3 bg-t-surface glass-card rounded-2xl shadow-sm text-t-primary"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <h2 className="text-xl font-bold text-t-primary">Dossiers Projets</h2>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6">
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-bold text-t-muted uppercase tracking-[0.2em] px-1">
                      Mes Dossiers
                    </h3>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-6">
                      {allProjects?.filter(p => p.userId === displayUserId || (p.contributors || []).some(c => c.userId === displayUserId)).length === 0 ? (
                        <div className="col-span-3 text-center py-10 text-t-muted italic text-sm">Aucun projet</div>
                      ) : (
                        allProjects?.filter(p => p.userId === displayUserId || (p.contributors || []).some(c => c.userId === displayUserId)).map(p => (
                          <button
                            key={p.id}
                            onClick={() => setViewingProjectDetailId(p.id)}
                            className="flex flex-col items-center space-y-2 group transition-all active:scale-95"
                          >
                            <div className="w-full aspect-square flex items-center justify-center transition-transform duration-300 relative group-hover:scale-105">
                              <svg className="w-full h-full text-[#FFCD29] drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M10 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V8C22 6.89 21.11 6 20 6H12L10 4Z" />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center pt-2">
                                <svg className="h-6 w-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-t-primary/80 text-center w-full px-1 capitalize break-words">{p.title}</span>
                            <div className="flex -space-x-1 mt-1">
                              {[p.userId, ...(p.contributors || []).map(c => c.userId)].slice(0, 3).map((uid, i) => {
                                const u = findUserById(uid);
                                const colors = ['#FF6B6B', '#4ECDC4', '#3B5FE6', '#FF9F43', '#10AC84'];
                                return (
                                  <div 
                                    key={uid} 
                                    className="w-4 h-4 rounded-full border border-white flex items-center justify-center text-[5px] font-black text-white shadow-sm overflow-hidden uppercase" 
                                    style={{ zIndex: 10 - i, backgroundColor: colors[i % colors.length] }}
                                  >
                                    {u?.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <span>{u?.prenom?.[0] || '?'}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Journal Reader Modal (Same as used in ProjectDetail) */}
      <JournalReaderModal
        activeJournal={showJournalReader ? activeJournal : null}
        onClose={() => setShowJournalReader(false)}
        onEdit={null} /* Read-only */
      />
      {showContributionModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-midnight-blue/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-t-surface glass-card w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-8 pb-4 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-black text-t-primary uppercase tracking-tighter">
                Détails de contribution
              </h3>
              <button
                onClick={() => setShowContributionModal(false)}
                className="p-2 bg-t-surface-alt rounded-full text-t-muted hover:text-t-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center space-x-3">
                  <div className="w-8 h-8 bg-t-surface glass-card rounded-xl flex items-center justify-center text-[#3B5FE6] shadow-sm">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <p className="text-[11px] font-bold text-[#3B5FE6]">Proposez votre aide pour ce projet</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Description de votre aide</label>
                  <textarea
                    value={contributionText}
                    onChange={(e) => setContributionText(e.target.value)}
                    placeholder="Comment pouvez-vous aider sur ce projet ? (ex: Impression 3D des pièces, Programmation...)"
                    className="w-full h-48 p-5 bg-t-surface-alt rounded-[32px] border-2 border-transparent focus:border-[#3B5FE6]/20 focus:bg-t-surface glass-card outline-none text-sm font-medium transition-all resize-none"
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="p-8 pt-4 shrink-0">
              <button
                disabled={!contributionText.trim()}
                onClick={() => {
                  showNotification("Demande envoyée avec succès !");
                  setShowContributionModal(false);
                  setContributionText('');
                }}
                className="w-full py-4 bg-[#3B5FE6] text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all uppercase tracking-widest text-sm disabled:opacity-20"
              >
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Recognition Modal (Bottom Sheet) */}
      {showRecognitionModal && (
        <div className="fixed inset-0 z-[400] flex items-end justify-center bg-midnight-blue/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div
            className="fixed inset-0"
            onClick={() => setShowRecognitionModal(false)}
          ></div>
          <div className="bg-t-surface glass-card w-full max-w-lg rounded-t-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10 animate-in slide-in-from-bottom duration-500">
            {/* Handle Bar */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 shrink-0"></div>

            <div className="p-8 pb-4 flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-t-primary uppercase tracking-tighter">
                  Reconnaissance
                </h3>
                <p className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest">Remercier {displayUser?.prenom} pour son aide</p>
              </div>
              <button
                onClick={() => setShowRecognitionModal(false)}
                className="p-2 bg-t-surface-alt rounded-full text-t-muted hover:text-t-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8 custom-scrollbar">
              {/* Star Rating Section */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Note de l'aide</label>
                <div className="flex items-center space-x-2 justify-center py-2 bg-t-surface-alt rounded-3xl border border-t-border/50">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRecognitionRating(star)}
                      className={`p-1 hover:scale-110 transition-transform ${star <= recognitionRating ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Machine Selection Chips */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Sur quelle machine t'a-t-il aidé ?</label>
                <div className="flex flex-wrap gap-2">
                  {RECOGNITION_MACHINES.map(machine => (
                    <button
                      key={machine}
                      onClick={() => setSelectedMachine(machine === selectedMachine ? null : machine)}
                      className={`px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all border ${selectedMachine === machine
                          ? 'bg-[#3B5FE6] text-white border-[#3B5FE6] shadow-lg shadow-blue-500/20'
                          : 'bg-t-surface glass-card text-t-secondary border-t-border hover:border-[#3B5FE6]/30'
                        }`}
                    >
                      {machine}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Select */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Aidé sur un de tes projets ?</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full p-4 bg-t-surface-alt border border-t-border rounded-2xl outline-none focus:border-[#3B5FE6] text-sm font-bold text-t-primary appearance-none cursor-pointer"
                >
                  <option value="">Aucun projet spécifique</option>
                  {userProjects?.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              {/* Comment Field */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Ajouter un commentaire</label>
                <textarea
                  value={recognitionComment}
                  onChange={(e) => setRecognitionComment(e.target.value)}
                  placeholder="Écris un petit mot pour le remercier..."
                  className="w-full h-32 p-5 bg-t-surface-alt rounded-3xl border border-t-border focus:border-[#3B5FE6] focus:bg-t-surface glass-card outline-none text-sm font-medium transition-all resize-none custom-scrollbar"
                ></textarea>
              </div>
            </div>

            <div className="p-8 pt-4 shrink-0 bg-t-surface glass-card border-t border-t-border-subtle">
              <button
                disabled={!recognitionComment.trim() || recognitionRating === 0}
                onClick={() => {
                  showNotification(`Reconnaissance envoyée à ${displayUser?.prenom} !`);
                  setShowRecognitionModal(false);
                  setRecognitionComment('');
                  setSelectedMachine(null);
                  setSelectedProjectId('');
                  setRecognitionRating(0);
                }}
                className="w-full py-5 bg-[#3B5FE6] text-white font-black rounded-3xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all uppercase tracking-widest text-sm disabled:opacity-20"
              >
                Envoyer la reconnaissance
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Report Modal (Bottom Sheet) */}
      {showReportModal && (
        <div className="fixed inset-0 z-[400] flex items-end justify-center bg-midnight-blue/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div
            className="fixed inset-0"
            onClick={() => setShowReportModal(false)}
          ></div>
          <div className="bg-t-surface glass-card w-full max-w-lg rounded-t-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10 animate-in slide-in-from-bottom duration-500">
            {/* Handle Bar */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 shrink-0"></div>

            <div className="p-8 pb-4 flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-rose-500 uppercase tracking-tighter">
                  Signalement
                </h3>
                <p className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest">Signaler un comportement inapproprié</p>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 bg-t-surface-alt rounded-full text-t-muted hover:text-t-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8 custom-scrollbar">
              {/* Report Reasons */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Type de problème</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'disrespect', label: 'Manque de respect' },
                    { id: 'cooperation', label: 'Mauvaise collaboration' },
                    { id: 'copy', label: 'Vol ou copie d\'idée' }
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => setReportType(type.id)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${
                        reportType === type.id 
                          ? 'bg-rose-50 border-rose-200 text-rose-600' 
                          : 'bg-t-surface glass-card border-t-border-subtle text-t-secondary hover:border-t-border-strong'
                      }`}
                    >
                      <span className="text-sm font-bold">{type.label}</span>
                      {reportType === type.id && (
                        <svg className="h-5 w-5 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detail Field */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Détails supplémentaires</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Expliquez-nous ce qu'il s'est passé..."
                  className="w-full h-32 p-5 bg-t-surface-alt rounded-3xl border border-t-border focus:border-rose-500 focus:bg-t-surface glass-card outline-none text-sm font-medium transition-all resize-none custom-scrollbar"
                ></textarea>
              </div>
            </div>

            <div className="p-8 pt-4 shrink-0 bg-t-surface glass-card border-t border-t-border-subtle">
              <button
                disabled={!reportType || !reportDetails.trim()}
                onClick={() => {
                  showNotification("Signalement envoyé à l'administration.", "success");
                  setShowReportModal(false);
                  setReportType('');
                  setReportDetails('');
                }}
                className="w-full py-5 bg-rose-500 text-white font-black rounded-3xl shadow-xl shadow-rose-500/20 active:scale-[0.98] transition-all uppercase tracking-widest text-sm disabled:opacity-20"
              >
                Envoyer le signalement
              </button>
            </div>
          </div>
        </div>
      )}
      <ImageLightbox
        src={lightboxImage}
        alt="Photo de profil"
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
