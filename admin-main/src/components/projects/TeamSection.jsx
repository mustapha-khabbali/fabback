import { useState } from 'react';

const ROLE_OPTIONS = [
  { type: 'FOUNDER', label: 'Fondateur' },
  { type: 'CO_FOUNDER', label: 'Co-fondateur' },
  { type: 'TUTOR', label: 'Tuteur' },
  { type: 'CUSTOM', label: 'Personnalisé' }
];

function roleFromType(type, customName) {
  if (type === 'FOUNDER') return { role: 'Fondateur', accessLevel: 'FOUNDER' };
  if (type === 'CO_FOUNDER') return { role: 'Co-fondateur', accessLevel: 'CO_FOUNDER' };
  if (type === 'TUTOR') return { role: 'Tuteur', accessLevel: 'MEMBER' };
  return { role: (customName || '').trim() || 'Collaborateur', accessLevel: 'MEMBER' };
}

function typeFromContributor(c) {
  if (c.accessLevel === 'FOUNDER') return 'FOUNDER';
  if (c.accessLevel === 'CO_FOUNDER') return 'CO_FOUNDER';
  if (c.role === 'Tuteur') return 'TUTOR';
  return 'CUSTOM';
}

export default function TeamSection({ contributors, usersList, ownerId, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const [search, setSearch] = useState('');

  const list = contributors || [];
  const userById = {};
  (usersList || []).forEach((u) => { userById[u.id] = u; });
  const founder = userById[ownerId];
  const initials = (u) => (u?.prenom?.[0] || '') + (u?.nom?.[0] || '') || '?';
  const name = (u) => (u ? `${u.prenom} ${u.nom}` : 'Utilisateur inconnu');

  const startEdit = () => {
    setDraft(list.map((c) => {
      const roleType = typeFromContributor(c);
      return { userId: c.userId, roleType, customName: roleType === 'CUSTOM' ? c.role : '' };
    }));
    setSearch('');
    setEditing(true);
  };

  const cancel = () => { setEditing(false); setSearch(''); };

  const save = () => {
    const next = draft.map((d) => {
      const { role, accessLevel } = roleFromType(d.roleType, d.customName);
      return { userId: d.userId, role, accessLevel, status: 'ACCEPTED' };
    });
    onSave(next);
    setEditing(false);
    setSearch('');
  };

  const setRoleType = (userId, roleType) => setDraft(draft.map((d) => (d.userId === userId ? { ...d, roleType } : d)));
  const setCustomName = (userId, customName) => setDraft(draft.map((d) => (d.userId === userId ? { ...d, customName } : d)));
  const removeMember = (userId) => setDraft(draft.filter((d) => d.userId !== userId));

  const results = (() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return (usersList || []).filter((u) =>
      u.role === 'Stagiaire' &&
      u.id !== ownerId &&
      !draft.some((d) => d.userId === u.id) &&
      (`${u.prenom} ${u.nom}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
    );
  })();

  const addMember = (u) => {
    setDraft([...draft, { userId: u.id, roleType: 'TUTOR', customName: '' }]);
    setSearch('');
  };

  const FounderCard = (
    <div className="flex items-center gap-2.5 p-2.5 bg-accent-blue/[0.08] border border-accent-blue/20 rounded-lg">
      <div className="w-8 h-8 rounded-lg bg-accent-blue/20 text-accent-blue flex items-center justify-center text-[11px] font-black shrink-0 uppercase">{initials(founder)}</div>
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-white truncate">{name(founder)}</p>
        <p className="text-[8px] font-black text-accent-blue uppercase tracking-widest">Fondateur</p>
      </div>
    </div>
  );

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">L'Équipe</h5>
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {FounderCard}
          {list.map((c) => {
            const u = userById[c.userId];
            return (
              <div key={c.userId} className="flex items-center gap-2.5 p-2.5 bg-white/[0.04] border border-white/10 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] text-white/50 flex items-center justify-center text-[11px] font-black shrink-0 uppercase">{initials(u)}</div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-white truncate">{name(u)}</p>
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest truncate">{c.role}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {FounderCard}

          {draft.map((d) => {
            const u = userById[d.userId];
            return (
              <div key={d.userId} className="p-2.5 bg-white/[0.04] border border-white/10 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] text-white/50 flex items-center justify-center text-[11px] font-black shrink-0 uppercase">{initials(u)}</div>
                  <p className="flex-1 min-w-0 text-[12px] font-bold text-white truncate">{name(u)}</p>
                  <select
                    value={d.roleType}
                    onChange={(e) => setRoleType(d.userId, e.target.value)}
                    className="bg-white/[0.06] border border-white/10 text-white text-[11px] font-semibold rounded-lg px-2 py-1.5 outline-none focus:border-accent-blue/50 cursor-pointer shrink-0"
                  >
                    {ROLE_OPTIONS.map((r) => <option key={r.type} value={r.type}>{r.label}</option>)}
                  </select>
                  <button onClick={() => removeMember(d.userId)} className="p-1.5 text-white/40 hover:text-accent-red transition-colors cursor-pointer shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
                {d.roleType === 'CUSTOM' && (
                  <input
                    value={d.customName}
                    onChange={(e) => setCustomName(d.userId, e.target.value)}
                    placeholder="Nom du rôle personnalisé"
                    className="mt-2 w-full bg-white/[0.05] border border-white/10 text-white text-[12px] font-semibold rounded-lg px-3 py-2 outline-none focus:border-accent-blue/50"
                  />
                )}
              </div>
            );
          })}

          {/* Add stagiaire */}
          <div className="p-2.5 bg-white/[0.02] border border-dashed border-white/10 rounded-lg space-y-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ajouter un stagiaire..."
              className="w-full bg-white/[0.05] border border-white/10 text-white text-[12px] font-semibold rounded-lg px-3 py-2 outline-none focus:border-accent-blue/50"
            />
            {search.trim() && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="py-2 text-center text-white/25 italic text-[11px]">Aucun résultat</p>
                ) : results.map((u) => (
                  <button key={u.id} onClick={() => addMember(u)} className="w-full flex items-center gap-2.5 p-2 hover:bg-white/[0.05] rounded-lg transition-colors text-left cursor-pointer">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.06] text-white/50 flex items-center justify-center text-[10px] font-black shrink-0 uppercase">{initials(u)}</div>
                    <span className="flex-1 min-w-0 text-[12px] font-bold text-white truncate">{u.prenom} {u.nom}</span>
                    <span className="text-[9px] font-bold text-accent-blue uppercase tracking-wider shrink-0">+ Ajouter</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
