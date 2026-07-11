import { useMemo, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { api } from '../../../services/api';

const SYSTEM_SUPERVISOR_IDS = ['user-sara', 'system-sara'];

const PRESETS = [
  { title: 'Responsable Entrepreneuriat', role: 'administrateur', mode: 'direct' },
  { title: 'Responsable Incubateur', role: 'administrateur', mode: 'direct' },
  { title: 'Formateur PIE', role: 'formateur', mode: 'list' }
];

const ROLES = [
  { value: 'formateur', label: 'Formateur' },
  { value: 'administrateur', label: 'Administrateur' }
];

function normalizeRole(role) {
  return (role || '').toLowerCase();
}

function roleLabel(role) {
  return ROLES.find((r) => r.value === normalizeRole(role))?.label || role || 'Encadrant';
}

function subtitle(user) {
  return `${roleLabel(user?.role)}${user?.bio ? ` · ${user.bio}` : ''}`;
}

function uniqueById(users) {
  const seen = new Set();
  return users.filter((u) => {
    if (!u?.id || seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });
}

export default function SupervisorModal({ project, onClose, onSave }) {
  const { usersList, addCustomUser, showNotification } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [presetPick, setPresetPick] = useState(null);

  const rawSupervisorIds = project.supervisorIds || (project.supervisorId ? [project.supervisorId] : []);
  const initialSystemIds = rawSupervisorIds.filter((id) => SYSTEM_SUPERVISOR_IDS.includes(id));
  const protectedSystemIds = initialSystemIds.length > 0 ? initialSystemIds : ['user-sara'];

  const [selectedIds, setSelectedIds] = useState(() =>
    rawSupervisorIds.filter((id) => !SYSTEM_SUPERVISOR_IDS.includes(id))
  );

  const [newPrenom, setNewPrenom] = useState('');
  const [newNom, setNewNom] = useState('');
  const [newRole, setNewRole] = useState('formateur');
  const [newType, setNewType] = useState('');
  const [localCustomUsers, setLocalCustomUsers] = useState([]);

  const eligibleSupervisors = useMemo(() => {
    const combined = uniqueById([...usersList, ...localCustomUsers]);
    return combined.filter((u) =>
      (normalizeRole(u.role) === 'formateur' || normalizeRole(u.role) === 'administrateur') &&
      !SYSTEM_SUPERVISOR_IDS.includes(u.id)
    );
  }, [usersList, localCustomUsers]);

  const userById = useMemo(() => {
    const map = {};
    eligibleSupervisors.forEach((u) => { map[u.id] = u; });
    return map;
  }, [eligibleSupervisors]);

  const saveIds = (nextIds) => {
    const next = [...protectedSystemIds, ...nextIds].filter((id, index, ids) => ids.indexOf(id) === index);
    onSave(next);
  };

  const filteredSupervisors = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return eligibleSupervisors.filter((u) =>
      !selectedIds.includes(u.id) &&
      (`${u.prenom} ${u.nom}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
    );
  }, [searchQuery, eligibleSupervisors, selectedIds]);

  const presetMatches = (preset) => eligibleSupervisors.filter((u) =>
    normalizeRole(u.role) === preset.role &&
    (u.bio || '') === preset.title &&
    !selectedIds.includes(u.id)
  );

  const handleAdd = (id) => {
    if (selectedIds.includes(id) || SYSTEM_SUPERVISOR_IDS.includes(id)) return;
    const nextIds = [...selectedIds, id];
    setSelectedIds(nextIds);
    saveIds(nextIds);
    setSearchQuery('');
    setPresetPick(null);
    showNotification('Encadrant ajouté');
  };

  const handleRemove = (id) => {
    const nextIds = selectedIds.filter((x) => x !== id);
    setSelectedIds(nextIds);
    saveIds(nextIds);
    showNotification('Encadrant retiré');
  };

  const handlePreset = (preset) => {
    if (preset.mode === 'direct') {
      const match = presetMatches(preset)[0];
      if (match) {
        handleAdd(match.id);
      } else {
        // Distinguish "not in the list" from "already added" — presetMatches
        // excludes already-selected people, which used to surface as a
        // misleading "Aucun trouvé".
        const alreadyAdded = eligibleSupervisors.some((u) =>
          normalizeRole(u.role) === preset.role && (u.bio || '') === preset.title
        );
        if (alreadyAdded) {
          showNotification(`« ${preset.title} » est déjà encadrant du projet.`);
        } else {
          showNotification(`Aucun « ${preset.title} » trouvé.`, 'error');
        }
      }
      return;
    }
    setPresetPick(presetPick === preset.title ? null : preset.title);
  };

  const handleCreateAndAssign = async () => {
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
      setLocalCustomUsers((prev) => [...prev, newSupervisor]);

      const nextIds = [...selectedIds, newSupervisor.id];
      setSelectedIds(nextIds);
      saveIds(nextIds);

      setNewPrenom('');
      setNewNom('');
      setNewRole('formateur');
      setNewType('');
      showNotification(`Encadrant ${newSupervisor.prenom} ${newSupervisor.nom} créé et ajouté.`);
    } catch (error) {
      showNotification(error.message || "Création de l'encadrant impossible.", 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-midnight-blue/60 backdrop-blur-sm">
      <div className="bg-t-surface w-full max-w-lg rounded-[32px] p-8 shadow-2xl flex flex-col space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-t-primary">Encadrants du projet</h3>
          <button onClick={onClose} className="p-2 text-t-tertiary hover:text-t-primary transition-colors">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1 font-black">Encadrants Actuels</label>
          <div className="grid grid-cols-2 gap-3 max-h-44 overflow-y-auto custom-scrollbar pr-1">
            <div className="flex items-center justify-between p-3.5 bg-blue-50 border border-blue-100 rounded-2xl animate-in fade-in duration-200">
              <div className="min-w-0">
                <span className="block text-xs font-bold text-t-primary truncate">Sara Ladouy</span>
                <span className="block text-[9px] font-black text-[#3B5FE6] uppercase tracking-widest truncate">Responsable Fab Lab</span>
              </div>
              <span className="text-[9px] text-t-muted uppercase tracking-wider font-black shrink-0">Fixe</span>
            </div>

            {selectedIds.map((svId) => {
              const sv = userById[svId];
              if (!sv) return null;
              return (
                <div key={svId} className="flex items-center justify-between p-3.5 bg-t-surface-alt border border-t-border/50 rounded-2xl animate-in fade-in duration-200">
                  <div className="min-w-0 mr-2">
                    <span className="block text-xs font-bold text-t-primary truncate">{sv.prenom} {sv.nom}</span>
                    <span className="block text-[9px] font-black text-t-primary/35 uppercase tracking-widest truncate">{subtitle(sv)}</span>
                  </div>
                  <button
                    onClick={() => handleRemove(svId)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                    title="Retirer"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-t-border/50">
          <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1 font-black">Options rapides</label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.title}
                onClick={() => handlePreset(preset)}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${presetPick === preset.title ? 'bg-blue-50 text-[#3B5FE6] border-[#3B5FE6]/30' : 'bg-t-surface-alt text-t-secondary border-t-border hover:border-[#3B5FE6]/30'}`}
              >
                {preset.title}
              </button>
            ))}
          </div>

          {presetPick && (() => {
            const preset = PRESETS.find((p) => p.title === presetPick);
            const matches = presetMatches(preset);
            return (
              <div className="border border-t-border bg-t-surface rounded-2xl max-h-40 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {matches.length === 0 ? (
                  <div className="p-3 text-center text-xs text-t-tertiary italic">Aucun « {presetPick} » trouvé</div>
                ) : matches.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleAdd(user.id)}
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

        <div className="space-y-4 pt-4 border-t border-t-border/50">
          <div className="space-y-1.5 relative">
            <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1 font-black">Ajouter un encadrant</label>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
              placeholder="Rechercher par nom ou email..."
              className="w-full p-4 bg-t-surface-alt border border-transparent rounded-2xl focus:bg-t-surface focus:border-midnight-blue outline-none transition-all font-bold text-t-primary"
            />

            {searchQuery.trim() && (
              <div className="absolute top-[76px] left-0 right-0 border border-t-border bg-t-surface rounded-2xl shadow-xl max-h-40 overflow-y-auto custom-scrollbar p-2 space-y-1 z-20 animate-in fade-in slide-in-from-top-1 duration-150">
                {filteredSupervisors.length === 0 ? (
                  <div className="p-3 text-center text-xs text-t-tertiary italic">Aucun encadrant trouvé</div>
                ) : (
                  filteredSupervisors.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleAdd(user.id)}
                      className="w-full flex items-center justify-between gap-3 p-3 hover:bg-t-surface-alt rounded-xl transition-all text-left text-t-primary font-bold"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm truncate">{user.prenom} {user.nom}</span>
                        <span className="block text-[9px] text-t-primary/35 uppercase tracking-widest truncate">{subtitle(user)}</span>
                      </span>
                      <span className="text-[10px] text-[#3B5FE6] uppercase tracking-wider shrink-0">+ Ajouter</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-t-border/50">
          <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1 font-black">Créer un nouvel encadrant</label>
          <div className="flex space-x-3">
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-bold text-t-muted uppercase tracking-widest px-1">Prénom</label>
              <input
                value={newPrenom}
                onChange={(e) => setNewPrenom(e.target.value)}
                type="text"
                placeholder="Ex: Ali"
                className="w-full p-3.5 bg-t-surface-alt border border-transparent rounded-2xl focus:bg-t-surface focus:border-midnight-blue outline-none transition-all font-bold text-t-primary text-sm"
              />
            </div>

            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-bold text-t-muted uppercase tracking-widest px-1">Nom</label>
              <input
                value={newNom}
                onChange={(e) => setNewNom(e.target.value)}
                type="text"
                placeholder="Ex: Bennani"
                className="w-full p-3.5 bg-t-surface-alt border border-transparent rounded-2xl focus:bg-t-surface focus:border-midnight-blue outline-none transition-all font-bold text-t-primary text-sm"
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="flex-1 p-3.5 bg-t-surface-alt border border-transparent rounded-2xl focus:bg-t-surface focus:border-midnight-blue outline-none transition-all font-bold text-t-primary text-sm"
            >
              {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
            <input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              type="text"
              placeholder="Type (titre)"
              className="flex-1 p-3.5 bg-t-surface-alt border border-transparent rounded-2xl focus:bg-t-surface focus:border-midnight-blue outline-none transition-all font-bold text-t-primary text-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleCreateAndAssign}
            disabled={!newPrenom.trim() || !newNom.trim() || !newType.trim()}
            className="w-full py-4 bg-t-surface-input hover:bg-gray-200 disabled:opacity-40 text-[#3B5FE6] font-bold rounded-2xl transition-all text-xs uppercase tracking-wider font-black border border-dashed border-t-border-strong"
          >
            Créer et ajouter
          </button>
        </div>

        <div className="flex pt-4 border-t border-t-border/50">
          <button
            onClick={onClose}
            className="w-full py-4 bg-[#3B5FE6] text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all text-sm text-center uppercase tracking-wider"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
