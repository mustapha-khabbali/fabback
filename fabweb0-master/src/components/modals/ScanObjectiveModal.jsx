import { useMemo, useState } from 'react';
import { useApp, TABS } from '../../context/AppContext';
import { getPrimaryUserId, isCurrentUserId } from '../../utils/userIdentity';
import { getEventSpaces } from '../../utils/eventSpaces';
import { api } from '../../services/api';

const SYSTEM_SUPERVISOR_IDS = ['user-sara', 'system-sara'];
const SARA_SUPERVISOR = {
  id: 'user-sara',
  prenom: 'Sara',
  nom: 'Ladouy',
  role: 'administrateur',
  bio: 'Responsable Fab Lab'
};

const DEFAULT_GATE_IN_CONFIG = {
  stagiaire: [
    { id: 'project', label: 'Projet en cours', requiresProject: true },
    { id: 'information', label: "Demande d'information / Consultation" },
    { id: 'idea', label: "Amélioration / Demande d'idée" },
    { id: 'event', label: 'Event', requiresEvent: true },
    { id: 'internship', label: 'Stage' },
    { id: 'other', label: 'Other', requiresText: true }
  ]
};

const NEW_SUPERVISOR_ROLES = [
  { value: 'formateur', label: 'Formateur' },
  { value: 'administrateur', label: 'Administrateur' }
];

const SUPERVISOR_PRESETS = [
  { title: 'Responsable Entrepreneuriat', role: 'administrateur', mode: 'direct' },
  { title: 'Responsable Incubateur', role: 'administrateur', mode: 'direct' },
  { title: 'Formateur PIE', role: 'formateur', mode: 'list' }
];

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

function normalizeRole(role) {
  return (role || '').toLowerCase();
}

function roleLabel(role) {
  const normalized = normalizeRole(role);
  if (normalized === 'formateur') return 'Formateur';
  if (normalized === 'administrateur') return 'Administrateur';
  return role || 'Encadrant';
}

function supervisorSubtitle(user) {
  return `${roleLabel(user?.role)}${user?.bio ? ` · ${user.bio}` : ''}`;
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export default function ScanObjectiveModal() {
  const {
    showScanObjectiveModal,
    setShowScanObjectiveModal,
    setIsUserInLab,
    currentUser,
    userProjects,
    allProjects,
    saveProjects,
    usersList,
    addCustomUser,
    showNotification,
    pendingScanPayload,
    setPendingScanPayload,
    setActiveTab,
    requestProjectCreate,
    scanObjectivePreset,
    setScanObjectivePreset
  } = useApp();

  const config = useMemo(loadGateInConfig, [showScanObjectiveModal]);
  const events = useMemo(loadGateInEvents, [showScanObjectiveModal]);
  const options = config.stagiaire || DEFAULT_GATE_IN_CONFIG.stagiaire;

  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEventSpace, setSelectedEventSpace] = useState('');
  const [customText, setCustomText] = useState('');
  const [showNewSupervisor, setShowNewSupervisor] = useState(false);
  const [presetPick, setPresetPick] = useState(null);
  const [newPrenom, setNewPrenom] = useState('');
  const [newNom, setNewNom] = useState('');
  const [newRole, setNewRole] = useState('formateur');
  const [newType, setNewType] = useState('');
  const currentUserId = getPrimaryUserId(currentUser);
  const forcedOptionId = pendingScanPayload?.gate === 'EVENT' ? 'event' : scanObjectivePreset;

  const allAvailableProjects = useMemo(() => {
    const localProjectIds = new Set((userProjects || []).map((project) => project.id));
    return uniqueById([...(userProjects || []), ...(allProjects || [])])
      .filter((project) => localProjectIds.has(project.id) || isCurrentUserId(currentUser, project.userId));
  }, [userProjects, allProjects, currentUser]);

  const userById = useMemo(() => {
    const map = { [SARA_SUPERVISOR.id]: SARA_SUPERVISOR, 'system-sara': SARA_SUPERVISOR };
    (usersList || []).forEach((user) => { map[user.id] = user; });
    return map;
  }, [usersList]);

  const eligibleSupervisors = useMemo(() => (
    (usersList || []).filter((user) =>
      (normalizeRole(user.role) === 'formateur' || normalizeRole(user.role) === 'administrateur') &&
      !SYSTEM_SUPERVISOR_IDS.includes(user.id)
    )
  ), [usersList]);

  if (!showScanObjectiveModal) return null;

  const effectiveSelectedOptionId = selectedOptionId || forcedOptionId;
  const selectedOption = options.find((option) => option.id === effectiveSelectedOptionId);
  const selectedEvent = events.find((item) => item.id === selectedEventId);
  const selectedEventSpaces = getEventSpaces(selectedEvent);
  const selectedProject = allAvailableProjects.find((project) => project.id === selectedProjectId);
  const projectSupervisorIds = selectedProject
    ? uniqueById((selectedProject.supervisorIds || [])
      .filter((id) => !SYSTEM_SUPERVISOR_IDS.includes(id))
      .map((id) => ({ id })))
      .map((item) => item.id)
    : [];

  const presetMatches = (preset) => eligibleSupervisors.filter((user) =>
    normalizeRole(user.role) === preset.role &&
    (user.bio || '') === preset.title &&
    !projectSupervisorIds.includes(user.id)
  );

  const reset = () => {
    setSelectedOptionId('');
    setSelectedProjectId('');
    setSelectedSupervisorId('');
    setSelectedEventId('');
    setSelectedEventSpace('');
    setCustomText('');
    setShowNewSupervisor(false);
    setPresetPick(null);
    setNewPrenom('');
    setNewNom('');
    setNewRole('formateur');
    setNewType('');
    setScanObjectivePreset?.('');
  };

  const close = () => {
    reset();
    setPendingScanPayload(null);
    setShowScanObjectiveModal(false);
  };

  const goToProjectCreate = () => {
    setSelectedOptionId('');
    setSelectedProjectId('');
    setSelectedSupervisorId('');
    setSelectedEventId('');
    setSelectedEventSpace('');
    setCustomText('');
    setShowNewSupervisor(false);
    setPresetPick(null);
    setNewPrenom('');
    setNewNom('');
    setNewRole('formateur');
    setNewType('');
    setScanObjectivePreset?.('project');
    setShowScanObjectiveModal(false);
    requestProjectCreate?.({ returnToScan: true });
    setActiveTab(TABS.MY_PROJECT);
  };

  const attachSupervisorToProject = (supervisorId) => {
    if (!selectedProject || !supervisorId || SYSTEM_SUPERVISOR_IDS.includes(supervisorId)) return;

    let projectWasUpdated = false;
    const updatedProjects = (userProjects || []).map((project) => {
      if (project.id !== selectedProject.id) return project;
      projectWasUpdated = true;
      const supervisorIds = uniqueById([
        ...((project.supervisorIds || ['user-sara']).map((id) => ({ id }))),
        { id: supervisorId }
      ]).map((item) => item.id);
      return { ...project, supervisorIds };
    });

    if (!projectWasUpdated) {
      const supervisorIds = uniqueById([
        ...((selectedProject.supervisorIds || ['user-sara']).map((id) => ({ id }))),
        { id: supervisorId }
      ]).map((item) => item.id);
      saveProjects([...(userProjects || []), { ...selectedProject, supervisorIds }]);
    } else {
      saveProjects(updatedProjects);
    }

    setSelectedSupervisorId(supervisorId);
    setShowNewSupervisor(false);
    setPresetPick(null);
    showNotification('Encadrant ajouté au projet.');
  };

  const handlePreset = (preset) => {
    if (!selectedProject) {
      showNotification('Veuillez choisir un projet.', 'error');
      return;
    }

    if (preset.mode === 'direct') {
      const match = presetMatches(preset)[0];
      if (match) {
        attachSupervisorToProject(match.id);
      } else {
        showNotification(`Aucun « ${preset.title} » trouvé.`, 'error');
      }
      return;
    }

    setPresetPick(presetPick === preset.title ? null : preset.title);
    setShowNewSupervisor(false);
  };

  const addSupervisorToProject = async () => {
    if (!selectedProject) {
      showNotification('Veuillez choisir un projet.', 'error');
      return;
    }
    if (!newPrenom.trim() || !newNom.trim() || !newType.trim()) {
      showNotification('Prénom, Nom et Type requis.', 'error');
      return;
    }

    try {
      const newSupervisor = await api.createUser({
      prenom: newPrenom.trim(),
      nom: newNom.trim(),
      role: newRole,
      email: '',
      tel: '',
      cin: '',
      cef: 'N/A',
      pole: 'Direction',
      bio: newType.trim(),
      points: 0,
      avatar: null
      });

      addCustomUser(newSupervisor);
      attachSupervisorToProject(newSupervisor.id);

      setNewPrenom('');
      setNewNom('');
      setNewRole('formateur');
      setNewType('');
    } catch (error) {
      showNotification(error.message || "Création de l'encadrant impossible.", 'error');
    }
  };

  const finalize = async () => {
    if (!selectedOption) {
      showNotification('Veuillez sélectionner un objectif.', 'error');
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
    if (selectedOption.requiresEvent && selectedEventSpaces.length > 0 && !selectedEventSpace) {
      showNotification('Veuillez choisir un espace.', 'error');
      return;
    }
    if (selectedOption.requiresText && !customText.trim()) {
      showNotification("Veuillez indiquer l'objectif.", 'error');
      return;
    }

    const event = selectedEvent;
    const finalSupervisorId = selectedSupervisorId || 'user-sara';
    const supervisor = userById[finalSupervisorId] || SARA_SUPERVISOR;
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

    if (selectedOption.requiresProject) {
      logEntry.projectId = selectedProject.id;
      logEntry.projectTitle = selectedProject.title;
      logEntry.supervisorId = finalSupervisorId;
      logEntry.supervisorName = supervisor ? `${supervisor.prenom} ${supervisor.nom}` : '';
      logEntry.supervisorType = supervisorSubtitle(supervisor);
    }
    if (selectedOption.requiresEvent) {
      logEntry.eventId = event?.id || selectedEventId;
      logEntry.eventTitle = event?.title || '';
      logEntry.eventSpace = selectedEventSpace || '';
    }
    if (selectedOption.requiresText) {
      logEntry.comment = customText.trim();
    }

    try {
      const saved = await api.checkIn(logEntry);
      let attendance;
      try { attendance = JSON.parse(localStorage.getItem('lab_attendance') || '[]'); } catch {
        attendance = [];
      }
      attendance.unshift(saved || logEntry);
      localStorage.setItem('lab_attendance', JSON.stringify(attendance));

      if (saved && !saved.timestampOut) {
        setIsUserInLab(true);
      }
      setPendingScanPayload(null);
      reset();
      setShowScanObjectiveModal(false);
      showNotification("Entrée enregistrée avec succès !", 'success');
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
        <button onClick={close} className="absolute top-4 right-4 p-2 text-t-tertiary hover:text-t-primary transition-colors z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {effectiveSelectedOptionId && (
          <button onClick={reset} className="absolute top-4 left-4 p-2 text-t-tertiary hover:text-t-primary transition-colors z-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}

        <div className="text-center space-y-2 pt-2">
          <h3 className="text-2xl font-bold text-t-primary">
            {selectedOption?.label || "Objectif de la visite"}
          </h3>
          <p className="text-sm text-t-secondary font-medium leading-relaxed px-4">
            {selectedOption ? 'Complétez les informations puis validez.' : "Pourquoi entrez-vous au FabLab aujourd'hui ?"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-1 space-y-4">
          {!effectiveSelectedOptionId ? (
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
          ) : selectedOption?.requiresProject ? (
            <>
              {allAvailableProjects.length === 0 ? (
                <div className="space-y-4 py-4 text-center">
                  <p className="text-sm font-bold text-t-secondary">Vous n'avez aucun projet</p>
                  <button
                    type="button"
                    onClick={goToProjectCreate}
                    className="w-full py-3 bg-[#3B5FE6] text-white font-bold rounded-xl text-xs uppercase tracking-wider"
                  >
                    Créer un projet
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-t-tertiary uppercase px-1">Projet</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedSupervisorId(''); setShowNewSupervisor(false); setPresetPick(null); }}
                    className="w-full p-4 bg-t-surface-alt border border-t-border-strong rounded-2xl outline-none focus:bg-t-surface glass-card focus:border-midnight-blue text-sm font-bold transition-all"
                  >
                    <option value="">Choisir un projet</option>
                    {allAvailableProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedProject && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-t-tertiary uppercase px-1">Autre encadrant accompagné</label>
                  <select
                    value={selectedSupervisorId}
                    onChange={(e) => setSelectedSupervisorId(e.target.value)}
                    className="w-full p-4 bg-t-surface-alt border border-t-border-strong rounded-2xl outline-none focus:bg-t-surface glass-card focus:border-midnight-blue text-sm font-bold transition-all"
                  >
                    <option value="">Aucun autre encadrant</option>
                    {projectSupervisorIds.map((id) => {
                      const supervisor = userById[id];
                      if (!supervisor) return null;
                      return (
                        <option key={id} value={id}>
                          {supervisor.prenom} {supervisor.nom} - {supervisorSubtitle(supervisor)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {selectedProject && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-t-tertiary uppercase px-1">Options rapides</label>
                  <div className="flex flex-wrap gap-2">
                    {SUPERVISOR_PRESETS.map((preset) => (
                      <button
                        key={preset.title}
                        type="button"
                        onClick={() => handlePreset(preset)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${presetPick === preset.title ? 'bg-blue-50 text-[#3B5FE6] border-[#3B5FE6]/30' : 'bg-t-surface-alt text-t-secondary border-t-border hover:border-[#3B5FE6]/30'}`}
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>

                  {presetPick && (() => {
                    const preset = SUPERVISOR_PRESETS.find((item) => item.title === presetPick);
                    const matches = presetMatches(preset);
                    return (
                      <div className="border border-t-border bg-t-surface glass-card rounded-2xl max-h-36 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {matches.length === 0 ? (
                          <div className="p-3 text-center text-xs text-t-tertiary italic">Aucun « {presetPick} » trouvé</div>
                        ) : matches.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => attachSupervisorToProject(user.id)}
                            className="w-full flex items-center justify-between p-3 hover:bg-t-surface-alt rounded-xl transition-all text-left text-t-primary font-bold"
                          >
                            <span className="text-sm truncate">{user.prenom} {user.nom}</span>
                            <span className="text-[10px] text-[#3B5FE6] uppercase tracking-wider">+ Ajouter</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedProject && (
                <button
                  type="button"
                  onClick={() => { setShowNewSupervisor(!showNewSupervisor); setPresetPick(null); }}
                  className="w-full py-3 bg-t-surface-input hover:bg-gray-200 text-[#3B5FE6] font-bold rounded-2xl transition-all text-xs uppercase tracking-wider font-black border border-dashed border-t-border-strong"
                >
                  {showNewSupervisor ? 'Annuler ajout encadrant' : 'Ajouter un encadrant'}
                </button>
              )}

              {showNewSupervisor && (
                <div className="space-y-3 p-3 bg-t-surface-alt rounded-2xl border border-t-border">
                  <div className="flex space-x-2">
                    <input value={newPrenom} onChange={(e) => setNewPrenom(e.target.value)} placeholder="Prénom" className="w-1/2 p-3 bg-t-surface glass-card border border-t-border-strong rounded-xl outline-none focus:border-midnight-blue text-xs font-bold" />
                    <input value={newNom} onChange={(e) => setNewNom(e.target.value)} placeholder="Nom" className="w-1/2 p-3 bg-t-surface glass-card border border-t-border-strong rounded-xl outline-none focus:border-midnight-blue text-xs font-bold" />
                  </div>
                  <div className="flex space-x-2">
                    <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-1/2 p-3 bg-t-surface glass-card border border-t-border-strong rounded-xl outline-none focus:border-midnight-blue text-xs font-bold">
                      {NEW_SUPERVISOR_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                    <input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="Type (titre)" className="w-1/2 p-3 bg-t-surface glass-card border border-t-border-strong rounded-xl outline-none focus:border-midnight-blue text-xs font-bold" />
                  </div>
                  <button type="button" onClick={addSupervisorToProject} className="w-full py-3 bg-[#3B5FE6] text-white font-bold rounded-xl text-xs uppercase tracking-wider">
                    Créer et lier au projet
                  </button>
                </div>
              )}
            </>
          ) : selectedOption?.requiresEvent ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-t-tertiary uppercase px-1">Event</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    const eventId = e.target.value;
                    const event = events.find((item) => item.id === eventId);
                    const spaces = getEventSpaces(event);
                    setSelectedEventId(eventId);
                    setSelectedEventSpace(spaces.length === 1 ? spaces[0] : '');
                  }}
                  className="w-full p-4 bg-t-surface-alt border border-t-border-strong rounded-2xl outline-none focus:bg-t-surface glass-card focus:border-midnight-blue text-sm font-bold transition-all"
                >
                  <option value="">Choisir un event</option>
                  {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
                </select>
              </div>
              {selectedEventSpaces.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-t-tertiary uppercase px-1">Espace</label>
                  <select
                    value={selectedEventSpace}
                    onChange={(e) => setSelectedEventSpace(e.target.value)}
                    className="w-full p-4 bg-t-surface-alt border border-t-border-strong rounded-2xl outline-none focus:bg-t-surface glass-card focus:border-midnight-blue text-sm font-bold transition-all"
                  >
                    <option value="">Choisir un espace</option>
                    {selectedEventSpaces.map((space) => <option key={space} value={space}>{space}</option>)}
                  </select>
                </div>
              )}
            </div>
          ) : selectedOption?.requiresText ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-t-tertiary uppercase px-1">Objectif</label>
              <textarea value={customText} onChange={(e) => setCustomText(e.target.value)} rows={3} placeholder="Écrivez votre objectif..." className="w-full p-4 bg-t-surface-alt border border-t-border-strong rounded-2xl outline-none focus:bg-t-surface glass-card focus:border-midnight-blue text-sm font-bold transition-all resize-none" />
            </div>
          ) : (
            <div className="py-8 px-4 text-center">
              <p className="text-t-secondary font-medium italic">Validez votre entrée pour cette activité.</p>
            </div>
          )}
        </div>

        <button onClick={finalize} disabled={selectedOption?.requiresProject && allAvailableProjects.length === 0} className="w-full py-4 bg-emerald-500 text-white font-bold text-lg rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all shrink-0 disabled:opacity-40 disabled:active:scale-100">
          Valider l'entrée
        </button>
      </div>
    </div>
  );
}
