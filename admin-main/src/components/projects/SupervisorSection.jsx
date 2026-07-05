import { useState } from 'react';

// Ready-made encadrant options.
// 'direct' → single known person, added in one click. 'list' → pick from matches.
const PRESETS = [
  { title: 'Responsable Entrepreneuriat', role: 'Administrateur', mode: 'direct' },
  { title: 'Responsable Incubateur', role: 'Administrateur', mode: 'direct' },
  { title: 'Formateur PIE', role: 'Formateur', mode: 'list' }
];

const ROLES = ['Formateur', 'Administrateur'];

export default function SupervisorSection({ supervisorIds, usersList, onSave, onAddUser }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]); // [{ id, prenom, nom, role, type, isNew }]
  const [search, setSearch] = useState('');
  const [newPrenom, setNewPrenom] = useState('');
  const [newNom, setNewNom] = useState('');
  const [newRole, setNewRole] = useState('Formateur');
  const [newType, setNewType] = useState('');
  const [presetPick, setPresetPick] = useState(null); // preset title whose pick-list is open

  const userById = {};
  (usersList || []).forEach((u) => { userById[u.id] = u; });
  const ids = (supervisorIds || []).filter((id) => id !== 'user-sara' && id !== 'system-sara');
  const initials = (u) => (u?.prenom?.[0] || '') + (u?.nom?.[0] || '') || '?';
  const subtitle = (role, type) => `${role || 'Encadrant'}${type ? ` · ${type}` : ''}`;

  const startEdit = () => {
    setDraft(ids.map((id) => {
      const u = userById[id];
      return { id, prenom: u?.prenom || '', nom: u?.nom || '', role: u?.role || 'Formateur', type: u?.bio || '', isNew: false };
    }));
    setSearch('');
    setNewPrenom('');
    setNewNom('');
    setNewRole('Formateur');
    setNewType('');
    setPresetPick(null);
    setEditing(true);
  };

  const cancel = () => { setEditing(false); setSearch(''); setPresetPick(null); };

  const save = () => {
    // New encadrants → into the DB: role = catégorie, bio = type (À propos).
    draft.filter((d) => d.isNew).forEach((d) => onAddUser({
      id: d.id,
      prenom: d.prenom,
      nom: d.nom,
      role: d.role,
      bio: d.type,
      email: '', tel: '', cin: '', points: 0
    }));
    onSave(draft.map((d) => d.id));
    setEditing(false);
    setSearch('');
  };

  // Search matches both Formateur AND Administrateur.
  const results = (() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return (usersList || []).filter((u) =>
      (u.role === 'Formateur' || u.role === 'Administrateur') &&
      !draft.some((d) => d.id === u.id) &&
      (`${u.prenom} ${u.nom}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
    );
  })();

  const addExisting = (u) => {
    setDraft([...draft, { id: u.id, prenom: u.prenom, nom: u.nom, role: u.role, type: u.bio || '', isNew: false }]);
    setSearch('');
  };

  // Users already in the DB matching a preset (by rôle + type stored in bio), not yet added.
  const presetMatches = (p) => (usersList || []).filter((u) =>
    u.role === p.role && (u.bio || '') === p.title && !draft.some((d) => d.id === u.id)
  );

  const addFromUser = (u) => setDraft([...draft, { id: u.id, prenom: u.prenom, nom: u.nom, role: u.role, type: u.bio || '', isNew: false }]);

  const clickPreset = (p) => {
    if (p.mode === 'direct') {
      const match = (usersList || []).find((u) => u.role === p.role && (u.bio || '') === p.title);
      if (match && !draft.some((d) => d.id === match.id)) addFromUser(match);
      setPresetPick(null);
    } else {
      setPresetPick(presetPick === p.title ? null : p.title);
    }
  };

  const addNew = () => {
    if (!newPrenom.trim() || !newNom.trim() || !newType.trim()) return;
    const id = 'encadrant-' + Date.now();
    setDraft([...draft, { id, prenom: newPrenom.trim(), nom: newNom.trim(), role: newRole, type: newType.trim(), isNew: true }]);
    setNewPrenom('');
    setNewNom('');
    setNewRole('Formateur');
    setNewType('');
  };

  const remove = (id) => setDraft(draft.filter((d) => d.id !== id));

  const field = 'bg-white/[0.05] border border-white/10 text-white text-[12px] font-semibold rounded-lg px-3 py-2 outline-none focus:border-accent-blue/50';

  return (
    <div className="mb-6 pt-1">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Encadrants</h5>
        {editing ? (
          <div className="flex items-center gap-2">
            <button onClick={cancel} className="text-[10px] font-bold text-white/40 uppercase tracking-wider cursor-pointer">Annuler</button>
            <button onClick={save} className="px-3 py-1.5 bg-accent-blue hover:bg-accent-blue/85 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg cursor-pointer">Enregistrer</button>
          </div>
        ) : (
          <button onClick={startEdit} className="text-[10px] font-bold text-accent-blue uppercase tracking-wider cursor-pointer">Modifier</button>
        )}
      </div>

      {!editing ? (
        ids.length === 0 ? (
          <div className="py-5 text-center text-white/25 italic text-[12px] bg-white/[0.03] rounded-lg border border-dashed border-white/10">Aucun encadrant</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {ids.map((id) => {
              const u = userById[id];
              return (
                <div key={id} className="flex items-center gap-2.5 p-2.5 bg-white/[0.04] border border-white/10 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] text-white/50 flex items-center justify-center text-[11px] font-black shrink-0 uppercase">{initials(u)}</div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-white truncate">{u ? `${u.prenom} ${u.nom}` : 'Inconnu'}</p>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest truncate">{subtitle(u?.role, u?.bio)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-3">
          {draft.length > 0 && (
            <div className="space-y-2">
              {draft.map((d) => (
                <div key={d.id} className="flex items-center gap-2.5 p-2.5 bg-white/[0.04] border border-white/10 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] text-white/50 flex items-center justify-center text-[11px] font-black shrink-0 uppercase">{(d.prenom?.[0] || '') + (d.nom?.[0] || '')}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-white truncate">{d.prenom} {d.nom}</p>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest truncate">{d.isNew ? 'Nouveau · ' : ''}{subtitle(d.role, d.type)}</p>
                  </div>
                  <button onClick={() => remove(d.id)} className="p-1.5 text-white/40 hover:text-accent-red transition-colors cursor-pointer shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Ready-made options (above the search bar) */}
          <div className="p-2.5 bg-white/[0.02] border border-dashed border-white/10 rounded-lg space-y-2">
            <span className="block text-[9px] font-bold text-white/40 uppercase tracking-[2px]">Options rapides</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => {
                const active = presetPick === p.title;
                return (
                  <button
                    key={p.title}
                    onClick={() => clickPreset(p)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${active ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/40' : 'bg-white/[0.04] text-white/60 border-white/10 hover:border-white/20'}`}
                    title={p.role}
                  >
                    {p.title}
                  </button>
                );
              })}
            </div>

            {/* Pick-list for a 'list' preset (e.g. Formateur PIE) */}
            {presetPick && (() => {
              const p = PRESETS.find((x) => x.title === presetPick);
              const list = presetMatches(p);
              return (
                <div className="space-y-1 max-h-36 overflow-y-auto pt-1 border-t border-white/[0.06]">
                  {list.length === 0 ? (
                    <p className="py-2 text-center text-white/25 italic text-[11px]">Aucun « {presetPick} » pour le moment</p>
                  ) : list.map((u) => (
                    <button key={u.id} onClick={() => { addFromUser(u); setPresetPick(null); }} className="w-full flex items-center gap-2.5 p-2 hover:bg-white/[0.05] rounded-lg transition-colors text-left cursor-pointer">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.06] text-white/50 flex items-center justify-center text-[10px] font-black shrink-0 uppercase">{initials(u)}</div>
                      <span className="flex-1 min-w-0 text-[12px] font-bold text-white truncate">{u.prenom} {u.nom}</span>
                      <span className="text-[9px] font-bold text-accent-blue uppercase tracking-wider shrink-0">+ Ajouter</span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Search existing (Formateur + Administrateur) */}
          <div className="p-2.5 bg-white/[0.02] border border-dashed border-white/10 rounded-lg space-y-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un encadrant..."
              className={`${field} w-full`}
            />
            {search.trim() && (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="py-2 text-center text-white/25 italic text-[11px]">Aucun encadrant trouvé</p>
                ) : results.map((u) => (
                  <button key={u.id} onClick={() => addExisting(u)} className="w-full flex items-center gap-2.5 p-2 hover:bg-white/[0.05] rounded-lg transition-colors text-left cursor-pointer">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.06] text-white/50 flex items-center justify-center text-[10px] font-black shrink-0 uppercase">{initials(u)}</div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[12px] font-bold text-white truncate">{u.prenom} {u.nom}</span>
                      <span className="block text-[8px] font-black text-white/30 uppercase tracking-widest truncate">{subtitle(u.role, u.bio)}</span>
                    </div>
                    <span className="text-[9px] font-bold text-accent-blue uppercase tracking-wider shrink-0">+ Ajouter</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* New encadrant: nom, prénom, rôle, type */}
          <div className="p-2.5 bg-white/[0.02] border border-dashed border-white/10 rounded-lg space-y-2">
            <span className="block text-[9px] font-bold text-white/40 uppercase tracking-[2px]">Nouvel encadrant</span>
            <div className="flex gap-2">
              <input value={newPrenom} onChange={(e) => setNewPrenom(e.target.value)} placeholder="Prénom" className={`${field} flex-1 min-w-0`} />
              <input value={newNom} onChange={(e) => setNewNom(e.target.value)} placeholder="Nom" className={`${field} flex-1 min-w-0`} />
            </div>
            <div className="flex gap-2">
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className={`${field} flex-1 min-w-0 cursor-pointer`}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="Type (titre)" className={`${field} flex-1 min-w-0`} />
            </div>
            <button
              onClick={addNew}
              disabled={!newPrenom.trim() || !newNom.trim() || !newType.trim()}
              className="w-full py-2 bg-accent-blue hover:bg-accent-blue/85 disabled:opacity-30 text-white text-[10px] font-bold uppercase rounded-lg cursor-pointer"
            >
              Créer & ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
