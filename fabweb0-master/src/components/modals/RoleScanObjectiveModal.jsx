import { useMemo, useState } from 'react';
import { useApp, TABS } from '../../context/AppContext';
import { getPrimaryUserId } from '../../utils/userIdentity';
import { api } from '../../services/api';

const DEFAULT_GATE_IN_CONFIG = {
  staff: [
    { id: 'visit_objective', label: 'Objectif de visite', requiresText: true },
    { id: 'project', label: 'Project', requiresProject: true },
    { id: 'event', label: 'Event', requiresEvent: true }
  ],
  visitor: [
    { id: 'visit_objective', label: 'Objectif de visite', requiresText: true },
    { id: 'event', label: 'Event', requiresEvent: true }
  ]
};

function loadGateInConfig() {
  try {
    return { ...DEFAULT_GATE_IN_CONFIG, ...JSON.parse(localStorage.getItem('gate_in_config') || '{}') };
  } catch {
    return DEFAULT_GATE_IN_CONFIG;
  }
}

function loadGateInEvents() {
  try {
    return JSON.parse(localStorage.getItem('gate_in_events') || '[]');
  } catch {
    return [];
  }
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export default function RoleScanObjectiveModal() {
  const {
    showRoleScanObjectiveModal,
    setShowRoleScanObjectiveModal,
    setIsUserInLab,
    currentUser,
    setActiveTab,
    userProjects,
    allProjects,
    showNotification,
    pendingScanPayload,
    setPendingScanPayload
  } = useApp();

  const config = useMemo(loadGateInConfig, [showRoleScanObjectiveModal]);
  const events = useMemo(loadGateInEvents, [showRoleScanObjectiveModal]);
  const role = (currentUser?.role || '').toLowerCase();
  const isVisitor = role === 'visiteur';
  const options = isVisitor ? (config.visitor || DEFAULT_GATE_IN_CONFIG.visitor) : (config.staff || DEFAULT_GATE_IN_CONFIG.staff);

  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [customText, setCustomText] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const currentUserId = getPrimaryUserId(currentUser);

  const supervisedProjects = useMemo(() => {
    return uniqueById([...(userProjects || []), ...(allProjects || [])]).filter((project) =>
      (project.supervisorIds || []).map(String).includes(String(currentUserId))
    );
  }, [userProjects, allProjects, currentUserId]);

  if (!showRoleScanObjectiveModal) return null;

  const selectedOption = options.find((option) => option.id === selectedOptionId);

  const reset = () => {
    setSelectedOptionId('');
    setCustomText('');
    setSelectedProjectId('');
    setSelectedEventId('');
  };

  const close = () => {
    reset();
    setPendingScanPayload(null);
    setShowRoleScanObjectiveModal(false);
  };

  const finalize = async () => {
    if (!selectedOption) {
      showNotification('Veuillez sélectionner un objectif.', 'error');
      return;
    }
    if (selectedOption.requiresText && !customText.trim()) {
      showNotification("Veuillez indiquer l'objectif de votre visite.", 'error');
      return;
    }
    if (selectedOption.requiresProject && !selectedProjectId) {
      showNotification('Veuillez choisir un projet.', 'error');
      return;
    }
    if (selectedOption.requiresEvent && !selectedEventId) {
      showNotification('Veuillez choisir un événement.', 'error');
      return;
    }

    const project = supervisedProjects.find((item) => item.id === selectedProjectId);
    const event = events.find((item) => item.id === selectedEventId);
    const logEntry = {
      qr: pendingScanPayload,
      userId: currentUserId || 'guest',
      userName: `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim(),
      nom: currentUser.nom || '',
      prenom: currentUser.prenom || '',
      role: currentUser.role,
      cin: currentUser.cin || '',
      tel: currentUser.tel || '',
      email: currentUser.email || '',
      type: 'in',
      objective: selectedOption.label,
      timestamp: new Date().toISOString()
    };

    if (selectedOption.requiresText) {
      logEntry.comment = customText.trim();
    }
    if (selectedOption.requiresProject) {
      logEntry.projectId = project?.id || selectedProjectId;
      logEntry.projectTitle = project?.title || '';
    }
    if (selectedOption.requiresEvent) {
      logEntry.eventId = event?.id || selectedEventId;
      logEntry.eventTitle = event?.title || '';
    }

    try {
      const saved = await api.checkIn(logEntry);
      let attendance;
      try { attendance = JSON.parse(localStorage.getItem('lab_attendance') || '[]'); } catch {
        attendance = [];
      }
      attendance.unshift(saved || logEntry);
      localStorage.setItem('lab_attendance', JSON.stringify(attendance));

      setIsUserInLab(true);
      setPendingScanPayload(null);
      reset();
      setShowRoleScanObjectiveModal(false);
      showNotification("Entrée enregistrée avec succès !", 'success');
      setActiveTab(TABS.FABLAB);
    } catch (error) {
      showNotification(error.message || "Entrée impossible.", 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-midnight-blue/40 backdrop-blur-sm transition-opacity duration-300"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div className="bg-t-surface glass-card w-full max-w-sm rounded-[32px] p-8 shadow-2xl flex flex-col space-y-6 transition-transform duration-300 relative max-h-[88vh]">
        <button onClick={close} className="absolute top-4 right-4 p-2 text-t-tertiary hover:text-t-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {selectedOptionId && (
          <button onClick={reset} className="absolute top-4 left-4 p-2 text-t-tertiary hover:text-t-primary transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}

        <div className="text-center space-y-2 pt-2">
          <h3 className="text-2xl font-bold text-t-primary">
            {selectedOption?.label || 'Objectif de votre visite'}
          </h3>
          <p className="text-sm text-t-secondary font-medium leading-relaxed px-4">
            {selectedOption ? 'Complétez les informations puis validez.' : "Choisissez le motif de votre entrée."}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-1 space-y-4">
          {!selectedOptionId ? (
            <div className="space-y-2">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedOptionId(option.id)}
                  className="w-full p-4 bg-t-surface-alt border border-t-border rounded-2xl text-left text-sm font-bold text-t-primary hover:border-midnight-blue transition-all"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : selectedOption?.requiresText ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-t-tertiary uppercase px-1">Objectif de visite</label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={3}
                placeholder="Entrez l'objectif..."
                className="w-full p-4 bg-t-surface-alt border border-t-border-strong rounded-2xl outline-none focus:bg-t-surface glass-card focus:border-midnight-blue text-sm font-bold transition-all resize-none"
              />
            </div>
          ) : selectedOption?.requiresProject ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-t-tertiary uppercase px-1">Project</label>
              <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full p-4 bg-t-surface-alt border border-t-border-strong rounded-2xl outline-none focus:bg-t-surface glass-card focus:border-midnight-blue text-sm font-bold transition-all">
                <option value="">Choisir un projet encadré</option>
                {supervisedProjects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title}</option>
                ))}
              </select>
            </div>
          ) : selectedOption?.requiresEvent ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-t-tertiary uppercase px-1">Event</label>
              <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="w-full p-4 bg-t-surface-alt border border-t-border-strong rounded-2xl outline-none focus:bg-t-surface glass-card focus:border-midnight-blue text-sm font-bold transition-all">
                <option value="">Choisir un event</option>
                {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
              </select>
            </div>
          ) : null}
        </div>

        <button onClick={finalize} className="w-full py-4 bg-emerald-500 text-white font-bold text-lg rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all shrink-0">
          Valider
        </button>
      </div>
    </div>
  );
}
