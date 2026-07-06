import { useState, useMemo } from 'react';
import { poleOptions, niveauOptions, yearOptions, getFiliereOptions, getOptionChoices } from '../../data/trainingData';

const ROLES = ['Stagiaire', 'Formateur', 'Administrateur', 'Visiteur'];

const emptyForm = {
  role: 'Stagiaire',
  nom: '', prenom: '', email: '', tel: '', cin: '',
  cef: '', pole: '', niveau: 'Technicien Spécialisé', filiere: '', year: '', option: '',
  bio: ''
};

export default function AddUserModal({ onCreate, onClose }) {
  const [form, setForm] = useState(emptyForm);

  const isStagiaire = form.role === 'Stagiaire';
  const isFormateur = form.role === 'Formateur';

  const filiereList = useMemo(() => getFiliereOptions(form.pole, form.niveau), [form.pole, form.niveau]);
  const optionList = useMemo(() => getOptionChoices(form.pole, form.niveau, form.filiere, form.year), [form.pole, form.niveau, form.filiere, form.year]);

  const update = (field, value) => {
    const next = { ...form, [field]: value };
    if (field === 'role' && value === 'Stagiaire' && !next.niveau) {
      next.niveau = 'Technicien Spécialisé';
    }
    // Same cascade as the profile edit form.
    if (field === 'pole' || field === 'niveau') { next.filiere = ''; next.option = ''; }
    if (field === 'filiere' || field === 'year') { next.option = ''; }
    setForm(next);
  };

  const canCreate = form.nom.trim() && form.prenom.trim();

  const handleCreate = () => {
    if (!canCreate) return;
    const base = {
      role: form.role,
      prenom: form.prenom.trim(),
      nom: form.nom.trim(),
      email: form.email.trim(),
      tel: form.tel.trim(),
      cin: form.cin.trim(),
      bio: form.bio.trim(),
      points: 0
    };
    if (isStagiaire) {
      Object.assign(base, {
        cef: form.cef.trim(),
        pole: form.pole,
        niveau: form.niveau,
        filiere: form.filiere,
        year: form.year,
        ...(form.option ? { option: form.option } : {})
      });
    }
    onCreate(base);
  };

  const label = 'text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1';
  const field = 'bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#151b2e] border border-white/10 rounded-2xl shadow-2xl p-7 max-h-[88vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-bold text-white">Nouvel utilisateur</h3>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Role */}
        <div className="flex flex-col mb-4">
          <span className={label}>Rôle</span>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => update('role', r)}
                className={`px-3 py-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${form.role === r ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/40' : 'bg-white/[0.04] text-white/60 border-white/10 hover:border-white/20'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className={label}>Nom</span>
            <input type="text" value={form.nom} onChange={(e) => update('nom', e.target.value)} className={field} />
          </div>
          <div className="flex flex-col">
            <span className={label}>Prénom</span>
            <input type="text" value={form.prenom} onChange={(e) => update('prenom', e.target.value)} className={field} />
          </div>
          <div className="flex flex-col">
            <span className={label}>Email</span>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={field} />
          </div>
          <div className="flex flex-col">
            <span className={label}>Téléphone</span>
            <input type="text" value={form.tel} onChange={(e) => update('tel', e.target.value)} className={field} />
          </div>
          <div className="flex flex-col">
            <span className={label}>CIN</span>
            <input type="text" value={form.cin} onChange={(e) => update('cin', e.target.value)} className={`${field} uppercase`} />
          </div>

          {isStagiaire && (
            <>
              <div className="flex flex-col">
                <span className={label}>Code CEF</span>
                <input type="text" value={form.cef} onChange={(e) => update('cef', e.target.value)} className={field} />
              </div>
              <div className="flex flex-col">
                <span className={label}>Pôle</span>
                <select value={form.pole} onChange={(e) => update('pole', e.target.value)} className={`${field} cursor-pointer`}>
                  <option value="" disabled hidden>Sélectionner le pôle</option>
                  {poleOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <span className={label}>Niveau</span>
                <select value={form.niveau} onChange={(e) => update('niveau', e.target.value)} className={`${field} cursor-pointer`}>
                  <option value="" disabled hidden>Sélectionner le niveau</option>
                  {niveauOptions.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <span className={label}>Filière</span>
                <select value={form.filiere} onChange={(e) => update('filiere', e.target.value)} disabled={!form.pole || !form.niveau || filiereList.length === 0} className={`${field} cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}>
                  <option value="" disabled hidden>{!form.pole ? 'Sélectionner le pôle d’abord' : !form.niveau ? 'Sélectionner le niveau d’abord' : 'Sélectionner la filière'}</option>
                  {filiereList.map((f) => <option key={f.name} value={f.name}>{f.name === 'N' ? 'Aucune filière disponible' : f.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <span className={label}>Année</span>
                <select value={form.year} onChange={(e) => update('year', e.target.value)} className={`${field} cursor-pointer`}>
                  <option value="" disabled hidden>Sélectionner l'année</option>
                  {yearOptions.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
                </select>
              </div>
              {optionList.length > 0 && (
                <div className="flex flex-col">
                  <span className={label}>Option</span>
                  <select value={form.option} onChange={(e) => update('option', e.target.value)} className={`${field} cursor-pointer`}>
                    <option value="" disabled hidden>Sélectionner une option</option>
                    {optionList.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          <div className="flex flex-col md:col-span-2">
            <span className={label}>À propos</span>
            {isFormateur && (
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => update('bio', form.bio === 'Formateur PIE' ? '' : 'Formateur PIE')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${form.bio === 'Formateur PIE' ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/40' : 'bg-white/[0.04] text-white/60 border-white/10 hover:border-white/20'}`}
                >
                  Formateur PIE
                </button>
                <span className="text-[10px] text-white/30">ou saisir autre chose ci-dessous</span>
              </div>
            )}
            <textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} rows={2} placeholder={isFormateur ? "Type de l'encadrant..." : ''} className={`${field} min-h-0 leading-relaxed resize-none`} />
          </div>
        </div>

        <div className="flex flex-col space-y-2.5 pt-5">
          <button onClick={handleCreate} disabled={!canCreate} className="w-full bg-accent-blue hover:bg-accent-blue/85 disabled:opacity-30 text-white text-[13px] font-bold py-3 px-4 rounded-lg transition-colors cursor-pointer">
            Créer l'utilisateur
          </button>
          <button onClick={onClose} className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[13px] font-bold py-3 px-4 rounded-lg transition-colors cursor-pointer">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
