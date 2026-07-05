import { useState } from 'react';

const SPACE_PRESETS = ['FabLab', 'Espace Incubateur', 'Amphithéâtre 1', 'Amphithéâtre 2', 'Espace Coworking', 'Salle de conférence'];

const USER_TYPES = ['Stagiaire', 'Formateur', 'Administrateur', 'Visiteur'];

const ROLE_OPTIONS = [
  { type: 'INTERVENANT', label: 'Intervenant' },
  { type: 'CONFERENCIER', label: 'Conférencier' },
  { type: 'ANIMATEUR', label: 'Animateur' },
  { type: 'FORMATEUR', label: 'Formateur' },
  { type: 'JURY', label: 'Jury' },
  { type: 'ORGANISATEUR', label: 'Organisateur' },
  { type: 'INVITE', label: 'Invité' },
  { type: 'CUSTOM', label: 'Personnalisé' }
];

function roleLabel(roleType, customRole) {
  if (roleType === 'CUSTOM') return (customRole || '').trim() || 'Intervenant';
  return ROLE_OPTIONS.find((r) => r.type === roleType)?.label || 'Intervenant';
}

function typeFromRole(role) {
  const found = ROLE_OPTIONS.find((r) => r.label === role);
  return found ? found.type : (role ? 'CUSTOM' : 'INTERVENANT');
}

export default function EventForm({ event, users, onCreateUser, onSave, onBack }) {
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [intervenants, setIntervenants] = useState(
    (event?.intervenants || []).map((i) => ({
      id: i.id, prenom: i.prenom, nom: i.nom,
      roleType: typeFromRole(i.role), customRole: typeFromRole(i.role) === 'CUSTOM' ? i.role : ''
    }))
  );
  const [search, setSearch] = useState('');
  const [newPrenom, setNewPrenom] = useState('');
  const [newNom, setNewNom] = useState('');
  const [newType, setNewType] = useState('Formateur');
  const [spaces, setSpaces] = useState(event?.spaces || (event?.space ? [event.space] : []));
  const [customSpace, setCustomSpace] = useState('');
  const [dateMode, setDateMode] = useState(event?.dateMode || 'single');
  const [date, setDate] = useState(event?.date || '');
  const [dateFrom, setDateFrom] = useState(event?.dateFrom || '');
  const [dateTo, setDateTo] = useState(event?.dateTo || '');

  const initials = (p, n) => (p?.[0] || '') + (n?.[0] || '') || '?';
  const descPlain = description.trim();

  const results = (() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return users.filter((u) =>
      !intervenants.some((i) => i.id === u.id) &&
      (`${u.prenom} ${u.nom}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
    );
  })();

  const addExisting = (u) => {
    setIntervenants([...intervenants, { id: u.id, prenom: u.prenom, nom: u.nom, roleType: 'INTERVENANT', customRole: '' }]);
    setSearch('');
  };
  const addNew = () => {
    if (!newPrenom.trim() || !newNom.trim()) return;
    // Added straight to the database with only name + surname + type.
    const created = onCreateUser(newPrenom.trim(), newNom.trim(), newType);
    setIntervenants([...intervenants, { id: created.id, prenom: created.prenom, nom: created.nom, roleType: 'INTERVENANT', customRole: '' }]);
    setNewPrenom('');
    setNewNom('');
  };
  const setIntRole = (id, roleType) => setIntervenants(intervenants.map((i) => (i.id === id ? { ...i, roleType } : i)));
  const setIntCustom = (id, customRole) => setIntervenants(intervenants.map((i) => (i.id === id ? { ...i, customRole } : i)));
  const removeInt = (id) => setIntervenants(intervenants.filter((i) => i.id !== id));

  const toggleSpace = (s) => setSpaces((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const addCustomSpace = () => {
    const v = customSpace.trim();
    if (v && !spaces.includes(v)) setSpaces([...spaces, v]);
    setCustomSpace('');
  };
  const removeSpace = (s) => setSpaces(spaces.filter((x) => x !== s));

  const dateValid = dateMode === 'single' ? !!date : (!!dateFrom && !!dateTo && dateFrom <= dateTo);
  const intervenantsValid = intervenants.length > 0 && intervenants.every((i) => i.roleType !== 'CUSTOM' || i.customRole.trim());
  const isValid = title.trim() && descPlain && intervenantsValid && spaces.length > 0 && dateValid;

  const buildEvent = () => ({
    id: event?.id || (crypto.randomUUID ? crypto.randomUUID() : 'evt-' + Date.now()),
    title: title.trim(),
    description,
    intervenants: intervenants.map((i) => ({ id: i.id, prenom: i.prenom, nom: i.nom, role: roleLabel(i.roleType, i.customRole) })),
    spaces,
    dateMode,
    ...(dateMode === 'single' ? { date, dateFrom: '', dateTo: '' } : { date: '', dateFrom, dateTo }),
    archived: event?.archived || false,
    createdAt: event?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const handleSave = () => { if (isValid) onSave(buildEvent()); };

  const label = 'text-[9px] font-bold text-white/40 uppercase tracking-[2px] mb-1.5 ml-0.5';
  const field = 'bg-white/[0.05] border border-white/10 text-white text-[12px] font-semibold rounded-lg px-3 py-2.5 outline-none focus:border-accent-blue/50';

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} className="p-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/60 rounded-lg transition-colors cursor-pointer shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h4 className="flex-1 text-[13px] font-bold text-white truncate">{event ? "Modifier l'événement" : 'Nouvel Événement'}</h4>
      </div>

      {/* Scrollable body */}
      <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1 -mr-1">
        {/* Title */}
        <div className="flex flex-col">
          <span className={label}>Titre</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre..." className={field} />
        </div>

        {/* Description (plain) */}
        <div className="flex flex-col">
          <span className={label}>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Décrivez l'événement..." className={`${field} leading-relaxed resize-none`} />
        </div>

        {/* Intervenants */}
        <div className="flex flex-col">
          <span className={label}>Intervenants</span>

          {intervenants.length > 0 && (
            <div className="space-y-1.5 mb-1.5">
              {intervenants.map((i) => (
                <div key={i.id} className="p-2 bg-white/[0.04] border border-white/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-white/[0.06] text-white/50 flex items-center justify-center text-[10px] font-black shrink-0 uppercase">{initials(i.prenom, i.nom)}</div>
                    <p className="flex-1 min-w-0 text-[12px] font-bold text-white truncate">{i.prenom} {i.nom}</p>
                    <button onClick={() => removeInt(i.id)} className="p-1 text-white/40 hover:text-accent-red transition-colors cursor-pointer shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <select value={i.roleType} onChange={(e) => setIntRole(i.id, e.target.value)} className={`${field} w-full mt-1.5 cursor-pointer`}>
                    {ROLE_OPTIONS.map((r) => <option key={r.type} value={r.type}>{r.label}</option>)}
                  </select>
                  {i.roleType === 'CUSTOM' && (
                    <input value={i.customRole} onChange={(e) => setIntCustom(i.id, e.target.value)} placeholder="Rôle personnalisé" className={`${field} w-full mt-1.5`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Search existing */}
          <div className="p-2 bg-white/[0.02] border border-dashed border-white/10 rounded-lg space-y-1.5">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className={`${field} w-full`} />
            {search.trim() && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="py-1.5 text-center text-white/25 italic text-[11px]">Aucun résultat</p>
                ) : results.map((u) => (
                  <button key={u.id} onClick={() => addExisting(u)} className="w-full flex items-center gap-2 p-1.5 hover:bg-white/[0.05] rounded-lg transition-colors text-left cursor-pointer">
                    <div className="w-6 h-6 rounded-md bg-white/[0.06] text-white/50 flex items-center justify-center text-[10px] font-black shrink-0 uppercase">{initials(u.prenom, u.nom)}</div>
                    <span className="flex-1 min-w-0 text-[12px] font-bold text-white truncate">{u.prenom} {u.nom}</span>
                    <span className="text-[9px] font-bold text-accent-blue uppercase shrink-0">+</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create new (name + surname + type → database) */}
          <div className="mt-1.5 p-2 bg-white/[0.02] border border-dashed border-white/10 rounded-lg space-y-1.5">
            <span className="block text-[9px] font-bold text-white/40 uppercase tracking-[2px]">Nouvel intervenant</span>
            <div className="flex gap-1.5">
              <input value={newPrenom} onChange={(e) => setNewPrenom(e.target.value)} placeholder="Prénom" className={`${field} flex-1 min-w-0`} />
              <input value={newNom} onChange={(e) => setNewNom(e.target.value)} placeholder="Nom" className={`${field} flex-1 min-w-0`} />
            </div>
            <select value={newType} onChange={(e) => setNewType(e.target.value)} className={`${field} w-full cursor-pointer`}>
              {USER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={addNew} disabled={!newPrenom.trim() || !newNom.trim()} className="w-full py-2 bg-accent-blue hover:bg-accent-blue/85 disabled:opacity-30 text-white text-[10px] font-bold uppercase rounded-lg cursor-pointer">Créer & ajouter</button>
          </div>
        </div>

        {/* Space (multi-select) */}
        <div className="flex flex-col">
          <span className={label}>Espaces</span>
          <div className="flex flex-wrap gap-1.5">
            {SPACE_PRESETS.map((s) => {
              const selected = spaces.includes(s);
              return (
                <button key={s} onClick={() => toggleSpace(s)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${selected ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/40' : 'bg-white/[0.04] text-white/60 border-white/10 hover:border-white/20'}`}>{s}</button>
              );
            })}
          </div>
          {/* Custom spaces already added (not in presets) */}
          {spaces.filter((s) => !SPACE_PRESETS.includes(s)).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {spaces.filter((s) => !SPACE_PRESETS.includes(s)).map((s) => (
                <span key={s} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-accent-blue/15 text-accent-blue border border-accent-blue/40">
                  {s}
                  <button onClick={() => removeSpace(s)} className="cursor-pointer hover:text-white">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              ))}
            </div>
          )}
          {/* Add a custom space */}
          <div className="flex gap-1.5 mt-1.5">
            <input
              value={customSpace}
              onChange={(e) => setCustomSpace(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSpace(); } }}
              placeholder="Autre espace..."
              className={`${field} flex-1 min-w-0`}
            />
            <button onClick={addCustomSpace} disabled={!customSpace.trim()} className="px-3 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 disabled:opacity-30 text-white text-[10px] font-bold uppercase rounded-lg cursor-pointer shrink-0">Ajouter</button>
          </div>
        </div>

        {/* Date */}
        <div className="flex flex-col">
          <span className={label}>Date d'exécution</span>
          <div className="flex gap-1.5 mb-1.5">
            <button onClick={() => setDateMode('single')} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${dateMode === 'single' ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/40' : 'bg-white/[0.04] text-white/60 border-white/10'}`}>Date unique</button>
            <button onClick={() => setDateMode('range')} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${dateMode === 'range' ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/40' : 'bg-white/[0.04] text-white/60 border-white/10'}`}>Du – Au</button>
          </div>
          {dateMode === 'single' ? (
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          ) : (
            <div className="space-y-1.5">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-[2px] mb-1 ml-0.5">Du</span>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={field} />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-[2px] mb-1 ml-0.5">Au</span>
                <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className={field} />
              </div>
            </div>
          )}
          {dateMode === 'range' && dateFrom && dateTo && dateFrom > dateTo && (
            <p className="mt-1.5 text-[10px] font-bold text-accent-red">Le début doit précéder la fin.</p>
          )}
        </div>
      </div>

      {/* Footer action */}
      <div className="mt-4 pt-3 border-t border-white/[0.06]">
        <button onClick={handleSave} disabled={!isValid} className="w-full py-2.5 bg-accent-purple hover:brightness-110 disabled:opacity-30 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all cursor-pointer">Enregistrer</button>
      </div>
    </div>
  );
}
