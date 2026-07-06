import { useMemo, useState } from 'react';

const PROGRAM_TYPES = ['Hackathon', 'Event', 'Bootcamp', 'Workshop', 'Formation'];
const PROGRAM_RESULTS = ['Win', 'Participation'];

function groupProgramsByType(programs) {
  return programs.reduce((acc, program) => {
    if (!program.type) return acc;
    acc[program.type] = acc[program.type] || [];
    acc[program.type].push(program);
    return acc;
  }, {});
}

export default function ProgramsPanel({ user, onUpdatePrograms }) {
  const programs = useMemo(() => user?.programs || [], [user?.programs]);
  const groupedPrograms = useMemo(() => groupProgramsByType(programs), [programs]);
  const typeEntries = Object.entries(groupedPrograms);
  const [selectedType, setSelectedType] = useState('');
  const [form, setForm] = useState({ name: '', type: '', result: '' });
  const [isSaving, setIsSaving] = useState(false);

  const activeType = selectedType && groupedPrograms[selectedType] ? selectedType : typeEntries[0]?.[0] || '';
  const activePrograms = activeType ? groupedPrograms[activeType] || [] : [];

  const savePrograms = async (nextPrograms) => {
    setIsSaving(true);
    try {
      return await onUpdatePrograms(nextPrograms);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProgram = async () => {
    if (!form.name.trim() || !form.type || !form.result) {
      alert('Tous les champs sont obligatoires.');
      return;
    }

    const added = { name: form.name.trim(), type: form.type, result: form.result };
    const saved = await savePrograms([...programs, added]);
    if (saved) {
      setSelectedType(added.type);
      setForm({ name: '', type: '', result: '' });
    }
  };

  const handleRemoveProgram = async (targetIndex) => {
    const nextPrograms = programs.filter((_, index) => index !== targetIndex);
    const saved = await savePrograms(nextPrograms);
    if (saved && !nextPrograms.some((program) => program.type === activeType)) {
      setSelectedType('');
    }
  };

  return (
    <div className="section-card p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[2px]">Programme</h4>
          <p className="text-[13px] text-white/50">
            Participations de <span className="font-bold text-accent-blue">{user?.prenom} {user?.nom}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {typeEntries.length > 0 ? (
            typeEntries.map(([type, items]) => {
              const isActive = activeType === type;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 rounded-lg border text-[12px] font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-accent-blue border-accent-blue text-white'
                      : 'bg-white/[0.02] border-white/10 text-white/50 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <span>{type}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-black/20 text-white' : 'bg-white/10 text-white/50'
                  }`}>
                    {items.length}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-[12px] text-white/40 font-semibold">
              Aucun programme
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h5 className="text-[13px] font-bold text-white">{activeType || 'Participations'}</h5>
              <p className="text-[11px] text-white/40 mt-1">
                {activePrograms.length > 0 ? `${activePrograms.length} participation${activePrograms.length > 1 ? 's' : ''}` : 'Aucune participation enregistrée'}
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
            {activePrograms.length > 0 ? (
              activePrograms.map((program) => {
                const originalIndex = programs.indexOf(program);
                return (
                  <div key={`${program.type}-${program.name}-${originalIndex}`} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-white truncate">{program.name}</div>
                      <div className="text-[11px] font-semibold text-white/40 mt-1 uppercase tracking-[1px]">{program.type}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase border ${
                        program.result === 'Win'
                          ? 'bg-accent-blue text-white border-accent-blue'
                          : 'bg-white/[0.04] text-white/60 border-white/10'
                      }`}>
                        {program.result}
                      </span>
                      <button
                        onClick={() => handleRemoveProgram(originalIndex)}
                        disabled={isSaving}
                        className="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                        aria-label="Supprimer la participation"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center p-5 bg-white/[0.02] border border-white/5 rounded-xl">
                <p className="text-[12px] text-white/50">Aucune participation dans cette catégorie.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 h-fit space-y-4">
          <div>
            <h5 className="text-[13px] font-bold text-white">Ajouter une participation</h5>
            <p className="text-[11px] text-white/40 mt-1">Les trois champs sont obligatoires.</p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Nom</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50"
              />
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Type</span>
              <select
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50 cursor-pointer"
              >
                <option value="" disabled hidden>Sélectionner le type</option>
                {PROGRAM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Résultat</span>
              <select
                value={form.result}
                onChange={(event) => setForm((prev) => ({ ...prev, result: event.target.value }))}
                className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50 cursor-pointer"
              >
                <option value="" disabled hidden>Sélectionner le résultat</option>
                {PROGRAM_RESULTS.map((result) => <option key={result} value={result}>{result}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handleAddProgram}
            disabled={isSaving}
            className="w-full py-3.5 rounded-lg bg-accent-blue text-white text-[12px] font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
