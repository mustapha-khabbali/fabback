import { useState, useRef, useEffect } from 'react';
import { useApp, SCREENS, TABS } from '../../../context/AppContext';
import { validateEmail, validatePhone } from '../../../utils/validation';
import { buildPresenceHeatmapCells } from '../../../utils/presenceActivity';
import SettingsView from './SettingsView';
import { api } from '../../../services/api';
import AvatarCropModal from '../../common/AvatarCropModal';
import ImageLightbox from '../../common/ImageLightbox';
import { getCroppedAvatarDataUrl } from '../../../utils/avatarCrop';

const SHOW_PROFILE_LEVEL_BADGE = false;

export default function MyProfileTab() {
  const { 
    currentUser, 
    setCurrentUser, 
    navigateTo, 
    isProfileEditing, 
    setIsProfileEditing, 
    showNotification, 
    directProgramView, 
    setDirectProgramView, 
    setActiveTab,
    previousTab,
    navigationHistory,
    setNavigationHistory,
    setSelectedUser,
    setCurrentProjectId,
    presenceActivityEvents
  } = useApp();
  // Refs to avoid stale closures in handleBack
  const navHistoryRef = useRef(navigationHistory);
  const previousTabRef = useRef(previousTab);

  useEffect(() => {
    navHistoryRef.current = navigationHistory;
  }, [navigationHistory]);

  useEffect(() => {
    previousTabRef.current = previousTab;
  }, [previousTab]);

  const handleBack = () => {
    const history = navHistoryRef.current;
    if (history.length > 0) {
      const last = history[history.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setSelectedUser(last.selectedUser);
      setCurrentProjectId(last.currentProjectId || null);
      if (last.fromTab) {
        setActiveTab(last.fromTab);
      }
      return;
    }
    setCurrentProjectId(null);
    setSelectedUser(null);
    setActiveTab(previousTabRef.current || TABS.SCAN);
  };

  const isStagiaire = currentUser?.role === 'stagiaire';
  const heatmapCells = buildPresenceHeatmapCells(currentUser, presenceActivityEvents);
  const containerRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const [avatarCropImage, setAvatarCropImage] = useState(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isProfileEditing) return;

    const stop = (e) => e.stopPropagation();
    el.addEventListener('touchstart', stop, { passive: true });
    el.addEventListener('touchmove', stop, { passive: true });
    el.addEventListener('touchend', stop, { passive: true });

    return () => {
      el.removeEventListener('touchstart', stop);
      el.removeEventListener('touchmove', stop);
      el.removeEventListener('touchend', stop);
    };
  }, [isProfileEditing]);

  const [editForm, setEditForm] = useState({
    prenom: currentUser?.prenom || '',
    nom: currentUser?.nom || '',
    bio: currentUser?.bio || '',
    cin: currentUser?.cin || '',
    cef: currentUser?.cef || '',
    email: currentUser?.email || '',
    tel: currentUser?.tel || '',
    programs: currentUser?.programs || [],
  });
  const [selectedProgramType, setSelectedProgramType] = useState(null);
  const [newProgForm, setNewProgForm] = useState({ name: '', type: '', result: '' });

  // Programs feature state
  const [showProgramsView, setShowProgramsView] = useState(false);
  const [programsSubView, setProgramsSubView] = useState('menu'); // 'menu', 'new', 'history'
  const [selectedProgramDetail, setSelectedProgramDetail] = useState(null);
  const [programSubmissions, setProgramSubmissions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('program_submissions') || '[]'); } catch { return []; }
  });

  const handleProgramApprove = (program, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const submission = {
        submissionId: crypto.randomUUID(),
        programId: program.id,
        name: program.name,
        image: program.image,
        submittedAt: new Date().toISOString(),
        proofScreenshot: event.target.result
      };

      const updatedSubmissions = [submission, ...programSubmissions];
      setProgramSubmissions(updatedSubmissions);
      localStorage.setItem('program_submissions', JSON.stringify(updatedSubmissions));
      
      showNotification("Participation soumise pour approbation !");
      setSelectedProgramDetail(null);
      setProgramsSubView('history');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (directProgramView) {
      const prog = AVAILABLE_PROGRAMS.find(p => p.id === directProgramView.programId);
      if (prog) {
        setProgramsSubView('new');
        setSelectedProgramDetail(prog);
        setShowProgramsView(true);
      }
    }
  }, [directProgramView]);

  const unsubmittedCount = AVAILABLE_PROGRAMS.filter(ap => 
    !programSubmissions.some(sub => sub.programId === ap.id)
  ).length;

  const getProgramColor = (count) => {
    if (count === 1) return 'bg-amber-50 text-amber-600 border-amber-200 shadow-amber-100/50';
    if (count === 2) return 'bg-orange-50 text-orange-600 border-orange-200 shadow-orange-100/50';
    if (count === 3) return 'bg-rose-50 text-rose-600 border-rose-200 shadow-rose-100/50';
    if (count === 4) return 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-indigo-100/50';
    return 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-100/50'; // 5+
  };

  const updateEdit = (field, value) => setEditForm(prev => ({ ...prev, [field]: value }));

  const toggleEdit = () => {
    if (!isProfileEditing) {
      setEditForm({
        prenom: currentUser?.prenom || '',
        nom: currentUser?.nom || '',
        bio: currentUser?.bio || '',
        cin: currentUser?.cin || '',
        cef: currentUser?.cef || '',
        email: currentUser?.email || '',
        tel: currentUser?.tel || '',
        programs: currentUser?.programs || [],
      });
    }
    setIsProfileEditing(!isProfileEditing);
  };

  const saveChanges = async () => {
    if (!validateEmail(editForm.email)) {
      showNotification("Veuillez entrer une adresse email valide.", 'error');
      return;
    }
    if (!validatePhone(editForm.tel)) {
      showNotification("Le numéro de téléphone doit commencer par 06 ou 07 et contenir 10 chiffres au total.", 'error');
      return;
    }
    if (!currentUser?.id) {
      showNotification("Profil introuvable.", 'error');
      return;
    }

    try {
      const updated = await api.updateUser(currentUser.id, {
        prenom: editForm.prenom,
        nom: editForm.nom,
        bio: editForm.bio,
        cin: editForm.cin,
        cef: editForm.cef,
        email: editForm.email,
        tel: editForm.tel,
        programs: editForm.programs
      });
      setCurrentUser(updated);
      setIsProfileEditing(false);
      showNotification("Profil mis à jour avec succès !");
    } catch (error) {
      showNotification(error.message || "Profil impossible à mettre à jour.", 'error');
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;

    setAvatarCropImage(URL.createObjectURL(file));
    e.target.value = '';
  };

  const closeAvatarCrop = () => {
    if (avatarCropImage) {
      URL.revokeObjectURL(avatarCropImage);
    }
    setAvatarCropImage(null);
  };

  const saveAvatarCrop = async (cropPixels) => {
    if (!avatarCropImage || !currentUser?.id) return;

    try {
      setIsSavingAvatar(true);
      const avatar = await getCroppedAvatarDataUrl(avatarCropImage, cropPixels);
      const updated = await api.updateUser(currentUser.id, { avatar });
      setCurrentUser(updated);
    } catch {
      showNotification("Impossible de mettre à jour la photo de profil.", 'error');
    } finally {
      setIsSavingAvatar(false);
      closeAvatarCrop();
    }
  };

  const roleLabel = currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Stagiaire';

  if (showSettings) {
    return <SettingsView onBack={() => setShowSettings(false)} />;
  }

  return (
    <>
      <div 
        ref={containerRef}
        className="relative flex flex-col p-6 space-y-6 overflow-y-auto custom-scrollbar pt-12 pb-24 h-full"
      >
        {/* Back Button */}
        {navigationHistory && navigationHistory.length > 0 && (
          <button
            onClick={handleBack}
            className="absolute top-12 left-6 p-2 bg-t-surface glass-card rounded-xl text-[#3B5FE6] shadow-sm active:scale-90 transition-transform z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Settings Icon */}
        <button 
          onClick={() => setShowSettings(true)}
          className="absolute top-12 right-6 p-2 bg-t-surface glass-card rounded-xl text-t-muted hover:text-t-primary shadow-sm active:scale-90 transition-all z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Profile Header */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => currentUser?.avatar && setLightboxImage(currentUser.avatar)}
            disabled={!currentUser?.avatar}
            className="w-32 h-32 bg-t-surface glass-card rounded-full border-2 border-[#3B5FE6] flex items-center justify-center overflow-hidden shadow-2xl transition-transform active:scale-95 disabled:cursor-default"
          >
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-t-primary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <label className="absolute bottom-1 right-1 w-9 h-9 bg-[#3B5FE6] text-white rounded-full flex items-center justify-center border-4 border-[#F0F7FF] cursor-pointer hover:brightness-110 shadow-lg">
            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </label>
        </div>
        <div className="text-center space-y-2">
          {isProfileEditing ? (
            <div className="flex space-x-2 justify-center">
              <input value={editForm.prenom} onChange={e => updateEdit('prenom', e.target.value)} placeholder="Prénom"
                className="w-1/2 text-sm font-bold text-t-primary bg-blue-50/50 rounded-xl outline-none px-4 py-2 border-2 border-transparent focus:border-[#3B5FE6]" />
              <input value={editForm.nom} onChange={e => updateEdit('nom', e.target.value)} placeholder="Nom"
                className="w-1/2 text-sm font-bold text-t-primary bg-blue-50/50 rounded-xl outline-none px-4 py-2 border-2 border-transparent focus:border-[#3B5FE6]" />
            </div>
          ) : (
            <div className="text-2xl font-bold text-t-primary">{currentUser?.prenom} {currentUser?.nom}</div>
          )}
          <p className="text-t-tertiary font-bold text-sm uppercase tracking-widest">{roleLabel}</p>
          
          <div className="flex items-center justify-center space-x-2 pt-2">
            {SHOW_PROFILE_LEVEL_BADGE && isStagiaire && (
              <div className="bg-emerald-50 px-4 py-1.5 rounded-full flex items-center space-x-2 border border-emerald-100 shadow-sm">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  Level {Math.floor((currentUser?.points || 0) / 200) + 1}
                </span>
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
                    <div 
                      key={cell.key} 
                      className={`rounded-[1px] transition-all duration-500 hover:scale-125 hover:z-10 cursor-pointer ${cell.colorClass}`}
                      title={cell.title}
                    />
                  );
                })}
              </div>
            </div>
            {/* Heatmap Legend */}
            <div className="flex items-center justify-end px-2 pt-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold text-t-tertiary">Moins</span>
                <div className="flex space-x-[2px]">
                  <div className="w-[10px] h-[10px] rounded-[1px] bg-[#ebedf0]/40" title="Aucune présence"></div>
                  <div className="w-[10px] h-[10px] rounded-[1px] bg-[#9be9a8]" title="Présence faible"></div>
                  <div className="w-[10px] h-[10px] rounded-[1px] bg-[#40c463]" title="Présence moyenne"></div>
                  <div className="w-[10px] h-[10px] rounded-[1px] bg-[#30a14e]" title="Présence élevée"></div>
                  <div className="w-[10px] h-[10px] rounded-[1px] bg-[#216e39]" title="Présence record"></div>
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
            {isProfileEditing ? (
              <textarea value={editForm.bio} onChange={e => updateEdit('bio', e.target.value)} rows="3"
                className="w-full text-sm font-medium text-t-primary bg-blue-50/50 rounded-xl outline-none p-3 border-2 border-[#3B5FE6]/20 focus:border-[#3B5FE6] transition-all" />
            ) : (
              <div className="text-sm font-medium text-t-primary leading-relaxed">
                {currentUser?.bio || "Passionné par le Fab Lab et l'innovation technologique."}
              </div>
            )}
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
                <div className="text-sm font-bold text-t-primary">{currentUser?.pole || '-'}</div>
              </div>
              <div className="bg-t-surface glass-card p-4 rounded-2xl shadow-sm border border-t-border-subtle flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-[#3B5FE6]"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                  <span className="text-[10px] font-bold text-t-tertiary uppercase">Niveau</span>
                </div>
                <div className="text-sm font-bold text-t-primary">{currentUser?.niveau || '-'}</div>
              </div>
              <div className="bg-t-surface glass-card p-4 rounded-2xl shadow-sm border border-t-border-subtle group">
                <div className="flex items-center space-x-3 mb-1">
                  <div className="text-[#3B5FE6]"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
                  <span className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest">Filière</span>
                </div>
                <div className="text-sm font-bold text-t-primary leading-tight">{currentUser?.filiere || '-'}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-t-surface glass-card p-4 rounded-2xl shadow-sm border border-t-border">
                  <p className="text-[10px] font-bold text-t-tertiary uppercase">Année</p>
                  <div className="text-sm font-bold text-t-primary mt-0.5">{currentUser?.year || '-'}</div>
                </div>
                {currentUser?.option && currentUser.option !== 'N' && (
                  <div className="bg-t-surface glass-card p-4 rounded-2xl shadow-sm border border-t-border">
                    <p className="text-[10px] font-bold text-t-tertiary uppercase">Option</p>
                    <div className="text-sm font-bold text-t-primary mt-0.5">{currentUser.option}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* IDENTITY Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-t-tertiary uppercase tracking-widest px-1">Identifiants</h4>
          <div className="bg-t-surface glass-card p-5 rounded-3xl shadow-sm border border-t-border flex items-center justify-between">
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-t-tertiary uppercase">CIN</span>
                {isProfileEditing ? (
                  <input value={editForm.cin} onChange={e => updateEdit('cin', e.target.value)} placeholder="AB123456"
                    className="text-right w-1/2 text-sm font-bold text-t-primary bg-blue-50/50 rounded-lg outline-none px-2 py-1 border border-transparent focus:border-midnight-blue" />
                ) : (
                  <div className="text-sm font-bold text-t-primary uppercase">{currentUser?.cin || '-'}</div>
                )}
              </div>
              <div className="h-[1px] bg-t-surface-alt w-full"></div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-t-tertiary uppercase">CEF</span>
                {isProfileEditing ? (
                  <input type="number" value={editForm.cef} onChange={e => updateEdit('cef', e.target.value)} placeholder="2006062400264"
                    className="text-right w-1/2 text-sm font-bold text-t-primary bg-blue-50/50 rounded-lg outline-none px-2 py-1 border border-transparent focus:border-midnight-blue" />
                ) : (
                  <div className="text-sm font-bold text-t-primary">{currentUser?.cef || '-'}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MACHINES Section (Non-modifiable) */}
        {isStagiaire && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-t-tertiary uppercase tracking-widest px-1">Expertise Machines</h4>
            <div className="bg-t-surface glass-card p-5 rounded-[32px] shadow-sm border border-t-border space-y-4">
              {(currentUser?.machines || [
                { name: 'Impression 3D', level: 'Expert', color: 'bg-emerald-500' },
                { name: 'Découpe Laser', level: 'Intermédiaire', color: 'bg-blue-500' },
                { name: 'Arduino', level: 'Débutant', color: 'bg-amber-500' }
              ]).map((m, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${m.color || 'bg-gray-400'}`}></div>
                    <span className="text-[13px] font-bold text-t-primary">{m.name}</span>
                  </div>
                  <div className={`${m.color || 'bg-gray-400'} w-12 h-2.5 rounded-full`}>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROGRAMS Section (Modifiable) */}
        {isStagiaire && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-t-tertiary uppercase tracking-widest px-1">Programmes</h4>
            <div className="bg-t-surface glass-card p-5 rounded-[32px] shadow-sm border border-t-border space-y-4">
              {isProfileEditing ? (
                <div className="space-y-6">
                  {/* List of current programs to edit/remove */}
                  <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                    {editForm.programs.map((prog, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-2xl border border-blue-100 mb-2">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-t-primary uppercase">{prog.type}</span>
                          <span className="text-[10px] text-t-secondary">{prog.name}</span>
                        </div>
                        <button 
                          onClick={() => {
                            const newProgs = editForm.programs.filter((_, i) => i !== idx);
                            updateEdit('programs', newProgs);
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Form to add new program */}
                  <div className="p-4 bg-[#F0F7FF] rounded-3xl space-y-4 border-2 border-dashed border-[#3B5FE6]/20">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-t-tertiary uppercase px-1">Nouveau Programme</p>
                      <input 
                        value={newProgForm.name}
                        onChange={(e) => setNewProgForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nom (ex: Hackathon 2024)"
                        className="w-full text-sm font-bold text-t-primary bg-t-surface glass-card rounded-xl outline-none px-4 py-3 border-2 border-transparent focus:border-[#3B5FE6]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Hackathon', 'Event', 'Bootcamp', 'Workshop', 'Formation'].map(type => (
                        <button
                          key={type}
                          onClick={() => setNewProgForm(prev => ({ ...prev, type }))}
                          className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                            newProgForm.type === type 
                              ? 'bg-[#3B5FE6] text-white border-transparent shadow-md' 
                              : 'bg-t-surface glass-card text-t-tertiary border-blue-100'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setNewProgForm(prev => ({ ...prev, result: 'Win' }))}
                        className={`flex-1 py-2 text-[10px] font-black rounded-xl border uppercase transition-all ${
                          newProgForm.result === 'Win'
                            ? 'bg-[#3B5FE6] text-white border-transparent shadow-md'
                            : 'bg-t-surface glass-card text-t-tertiary border-blue-100'
                        }`}
                      >
                        Win
                      </button>
                      <button 
                        onClick={() => setNewProgForm(prev => ({ ...prev, result: 'Participation' }))}
                        className={`flex-1 py-2 text-[10px] font-black rounded-xl border uppercase transition-all ${
                          newProgForm.result === 'Participation'
                            ? 'bg-[#3B5FE6] text-white border-transparent shadow-md'
                            : 'bg-t-surface glass-card text-t-tertiary border-blue-100'
                        }`}
                      >
                        Participation
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        if (!newProgForm.name || !newProgForm.type || !newProgForm.result) {
                          showNotification("Champs manquants", 'error');
                          return;
                        }

                        updateEdit('programs', [...editForm.programs, { ...newProgForm }]);
                        setNewProgForm({ name: '', type: '', result: '' });
                        showNotification("Programme ajouté à la liste !");
                      }}
                      className="w-full py-4 bg-midnight-blue text-white text-[11px] font-black rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest"
                    >
                      Valider & Ajouter un autre
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentUser?.programs?.length > 0 ? (
                    Object.entries(
                      currentUser.programs.reduce((acc, p) => {
                        acc[p.type] = (acc[p.type] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([type, count], idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setSelectedProgramType(type)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all active:scale-95 ${getProgramColor(count)} shadow-sm`}
                      >
                        {type} ({count})
                      </button>
                    ))
                  ) : (
                    <p className="text-[11px] text-t-muted font-bold italic px-1">Aucun programme sélectionné</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Program Detail Modal */}
        {selectedProgramType && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-midnight-blue/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-t-surface glass-card w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 flex flex-col max-h-[80vh]">
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
                  <h3 className="text-2xl font-black text-t-primary leading-tight uppercase tracking-tighter">{selectedProgramType}</h3>
                  <p className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest">Liste des participations</p>
                </div>
              </div>

              {/* Scrollable List */}
              <div className="flex-1 overflow-y-auto px-8 pb-4 space-y-3 custom-scrollbar">
                {currentUser.programs
                  .filter(p => p.type === selectedProgramType)
                  .map((p, idx) => (
                    <div key={idx} className="p-4 bg-[#F0F7FF] rounded-2xl border border-blue-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-t-primary">{p.name}</p>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${p.result === 'Win' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                          {p.result}
                        </span>
                      </div>
                    </div>
                  ))}
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

        {/* CONTACT Section */}
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
                {isProfileEditing ? (
                  <input value={editForm.email} onChange={e => updateEdit('email', e.target.value)}
                    className="w-full text-sm font-bold text-t-primary bg-blue-50/50 rounded-lg outline-none px-2 py-0.5" />
                ) : (
                  <div className="text-sm font-bold text-t-primary leading-tight lowercase">{currentUser?.email || '-'}</div>
                )}
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
                {isProfileEditing ? (
                  <input value={editForm.tel} onChange={e => updateEdit('tel', e.target.value)}
                    className="w-full text-sm font-bold text-t-primary bg-blue-50/50 rounded-lg outline-none px-2 py-0.5" />
                ) : (
                  <div className="text-sm font-bold text-t-primary leading-tight">{currentUser?.tel || '-'}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-6 space-y-4">
        {/* Parked: Programs interface — re-enable when the admin can create real programs
        {!isProfileEditing && (
          <button 
            onClick={() => {
              setProgramsSubView('menu');
              setShowProgramsView(true);
            }}
            className="w-full py-4 bg-emerald-500 text-white font-bold text-lg rounded-2xl shadow-xl hover:brightness-110 transition-all flex items-center justify-center space-x-3 active:scale-95"
          >
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {unsubmittedCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-sm animate-bounce">
                  {unsubmittedCount}
                </span>
              )}
            </div>
            <span>Programmes</span>
          </button>
        )}
        */}

        {!isProfileEditing ? (
          <button onClick={toggleEdit}
            className="w-full py-4 bg-t-surface glass-card border-2 border-midnight-blue text-t-primary font-bold text-lg rounded-2xl shadow-sm hover:bg-t-surface-alt transition-all flex items-center justify-center space-x-3 active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>Modifier le profil</span>
          </button>
        ) : (
          <button onClick={saveChanges}
            className="w-full py-4 bg-green-500 text-white font-bold text-lg rounded-2xl shadow-xl hover:brightness-110 transition-all flex items-center justify-center space-x-3 active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Enregistrer les modifications</span>
          </button>
        )}

        <button onClick={() => navigateTo(SCREENS.HOME)}
          className="w-full py-4 bg-[#EB4444]/10 text-[#EB4444] font-bold text-lg rounded-2xl border-2 border-transparent hover:border-[#EB4444] transition-all flex items-center justify-center space-x-3 active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Se déconnecter</span>
        </button>
      </div>
    </div>

    {/* Programs Full-screen Interface */}
      {showProgramsView && (
        <div className="fixed inset-0 z-[200] bg-[#F0F7FF] flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
          {/* Header */}
          <div className="pt-12 pb-6 px-6 bg-t-surface glass-card border-b border-t-border flex items-center space-x-4 shadow-sm shrink-0">
            <button 
              onClick={() => {
                if (directProgramView) {
                  const returnTab = directProgramView.returnToTab;
                  setDirectProgramView(null);
                  setSelectedProgramDetail(null);
                  setShowProgramsView(false);
                  setActiveTab(returnTab);
                  return;
                }
                if (programsSubView === 'menu') setShowProgramsView(false);
                else if (selectedProgramDetail) setSelectedProgramDetail(null);
                else setProgramsSubView('menu');
              }}
              className="p-3 bg-[#3B5FE6]/5 rounded-2xl text-[#3B5FE6] active:scale-90 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-black text-t-primary uppercase tracking-tighter">
              {programsSubView === 'menu' ? 'Gestion des Programmes' : 
               programsSubView === 'new' ? 'Nouveaux Programmes' : 'Historique'}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {programsSubView === 'menu' && (
              <div className="grid grid-cols-1 gap-4 pt-4">
                <button 
                  onClick={() => setProgramsSubView('new')}
                  className="bg-t-surface glass-card p-8 rounded-[32px] shadow-sm border border-t-border-subtle flex flex-col items-center text-center space-y-4 active:scale-95 transition-all group"
                >
                  <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-[#3B5FE6] group-hover:scale-110 transition-transform relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {unsubmittedCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[12px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                        {unsubmittedCount}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-t-primary uppercase">Nouveaux Programmes</h3>
                    <p className="text-xs text-t-tertiary font-bold mt-1">Découvrez et rejoignez de nouveaux défis</p>
                  </div>
                </button>

                <button 
                  onClick={() => setProgramsSubView('history')}
                  className="bg-t-surface glass-card p-8 rounded-[32px] shadow-sm border border-t-border-subtle flex flex-col items-center text-center space-y-4 active:scale-95 transition-all group"
                >
                  <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-t-primary uppercase">Historique</h3>
                    <p className="text-xs text-t-tertiary font-bold mt-1">Consultez vos participations passées</p>
                  </div>
                </button>
              </div>
            )}

            {programsSubView === 'new' && !selectedProgramDetail && (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-t-tertiary uppercase tracking-[0.2em] px-2">Programmes Disponibles</p>
                {AVAILABLE_PROGRAMS.map(prog => (
                  <button 
                    key={prog.id}
                    onClick={() => setSelectedProgramDetail(prog)}
                    className="w-full bg-t-surface glass-card rounded-[32px] overflow-hidden shadow-sm border border-t-border-subtle active:scale-95 transition-all flex flex-col group"
                  >
                    <div className="h-40 w-full relative">
                      <img src={prog.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute bottom-4 left-6">
                        <span className="bg-[#FFCD29] text-t-primary text-[9px] font-black uppercase px-3 py-1 rounded-full shadow-lg">Nouveau</span>
                      </div>
                    </div>
                    <div className="p-6 text-left">
                      <h4 className="text-lg font-black text-t-primary leading-tight uppercase tracking-tight">{prog.name}</h4>
                      <p className="text-xs text-t-secondary font-medium mt-1 line-clamp-2">{prog.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {programsSubView === 'new' && selectedProgramDetail && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-t-surface glass-card rounded-[40px] overflow-hidden shadow-xl border border-t-border">
                  <div className="h-64 w-full relative">
                    <img src={selectedProgramDetail.image} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div className="absolute bottom-6 left-8 right-8">
                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight">{selectedProgramDetail.name}</h3>
                    </div>
                  </div>
                  <div className="p-8 space-y-8">
                    <div className="space-y-2 text-sm text-t-primary/80 font-medium leading-relaxed">
                      <p className="text-[10px] font-black text-t-tertiary uppercase tracking-widest mb-1">À propos de ce programme</p>
                      {selectedProgramDetail.description}
                    </div>

                    <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex flex-col items-center text-center space-y-4">
                      <p className="text-xs font-black text-[#3B5FE6] uppercase">Étape 1: Remplir le formulaire</p>
                      <a 
                        href={selectedProgramDetail.formLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-t-surface glass-card border-2 border-[#3B5FE6] text-[#3B5FE6] font-black rounded-2xl shadow-sm flex items-center justify-center space-x-3 active:scale-95 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 00-2 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>Ouvrir Google Form</span>
                      </a>
                    </div>

                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 flex flex-col items-center text-center space-y-4">
                      <p className="text-xs font-black text-emerald-600 uppercase">Étape 2: Valider votre participation</p>
                      <label className="w-full py-5 bg-emerald-500 text-white font-black rounded-3xl shadow-xl shadow-emerald-500/20 flex flex-col items-center justify-center space-y-1 active:scale-95 transition-all cursor-pointer">
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={(e) => handleProgramApprove(selectedProgramDetail, e)}
                        />
                        <div className="flex items-center space-x-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span className="text-base">APPROUVER</span>
                        </div>
                        <span className="text-[10px] opacity-70">Uploader la capture d'écran</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {programsSubView === 'history' && (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-t-tertiary uppercase tracking-[0.2em] px-2">Participations Passées</p>
                {programSubmissions.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 bg-t-surface-alt rounded-full flex items-center justify-center mx-auto mb-4 grayscale">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-t-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-t-muted font-bold italic">Aucun historique de programme</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {programSubmissions.map(sub => (
                      <div key={sub.submissionId} className="bg-t-surface glass-card p-5 rounded-3xl shadow-sm border border-t-border flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-t-border-subtle">
                          <img src={sub.image} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-black text-t-primary uppercase truncate tracking-tight">{sub.name}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">Soumis</span>
                            <span className="text-[9px] font-bold text-t-tertiary uppercase tracking-widest">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="w-12 h-12 bg-t-surface-alt rounded-xl flex items-center justify-center text-t-muted">
                          {sub.proofScreenshot ? (
                            <img src={sub.proofScreenshot} className="w-full h-full object-cover rounded-xl" alt="Proof" />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {avatarCropImage && (
        <AvatarCropModal
          image={avatarCropImage}
          isSaving={isSavingAvatar}
          onCancel={closeAvatarCrop}
          onSave={saveAvatarCrop}
        />
      )}
      <ImageLightbox
        src={lightboxImage}
        alt="Photo de profil"
        onClose={() => setLightboxImage(null)}
      />
    </>
  );
}

// Demo Data
const AVAILABLE_PROGRAMS = [
  {
    id: 'prog-demo-1',
    name: 'Hackathon Innovation 2026',
    description: 'Rejoignez-nous pour 48 heures de création intensive. Proposez des solutions technologiques pour améliorer la vie au sein du Fab Lab. Des prix passionnants attendent les gagnants !',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=600',
    formLink: 'https://forms.gle/demo-link-hackathon'
  },
  {
    id: 'prog-demo-2',
    name: 'Atelier Impression 3D Avancée',
    description: 'Perfectionnez vos compétences en impression 3D. Apprenez à utiliser de nouveaux matériaux et à optimiser vos modèles pour des impressions complexes.',
    image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=600',
    formLink: 'https://forms.gle/demo-link-3d'
  }
];
