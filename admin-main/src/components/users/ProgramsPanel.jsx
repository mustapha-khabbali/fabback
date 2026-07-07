import { useMemo, useState } from 'react';

const PROGRAM_TYPES = ['Hackathon', 'Event', 'Bootcamp', 'Workshop', 'Formation', 'Autre'];
const PROGRAM_RESULTS = ['Win', 'Participation'];
const CHIP_STYLES = [
  'bg-accent-blue/15 text-accent-blue border-accent-blue/35',
  'bg-accent-green/15 text-accent-green border-accent-green/35',
  'bg-accent-purple/15 text-accent-purple border-accent-purple/35',
  'bg-accent-amber/15 text-accent-amber border-accent-amber/35',
  'bg-white/[0.06] text-white/70 border-white/15',
  'bg-accent-red/10 text-accent-red border-accent-red/30'
];

const EMPTY_FORM = {
  name: '',
  description: '',
  dateMode: 'single',
  date: '',
  dateFrom: '',
  dateTo: '',
  type: '',
  result: '',
  image: null
};

function compressImageFile(file, maxSize = 512, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(image.src);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = () => reject(new Error('Image programme invalide.'));
    image.src = URL.createObjectURL(file);
  });
}

function countByType(programs) {
  return programs.reduce((acc, program) => {
    if (program.type) acc[program.type] = (acc[program.type] || 0) + 1;
    return acc;
  }, {});
}

function formatProgramDate(program) {
  if (program.dateMode === 'range') {
    if (program.dateFrom && program.dateTo) return `Du ${program.dateFrom} au ${program.dateTo}`;
    if (program.dateFrom) return `Depuis ${program.dateFrom}`;
    if (program.dateTo) return `Jusqu'au ${program.dateTo}`;
    return '';
  }
  return program.date || '';
}

function normalizeProgram(form) {
  return {
    name: form.name.trim(),
    type: form.type,
    result: form.result,
    description: form.description.trim() || null,
    dateMode: form.dateMode,
    date: form.dateMode === 'single' ? form.date || null : null,
    dateFrom: form.dateMode === 'range' ? form.dateFrom || null : null,
    dateTo: form.dateMode === 'range' ? form.dateTo || null : null,
    image: form.image || null
  };
}

export default function ProgramsPanel({ user, onUpdatePrograms }) {
  const programs = useMemo(() => user?.programs || [], [user?.programs]);
  const typeCounts = useMemo(() => countByType(programs), [programs]);
  const [selectedType, setSelectedType] = useState('Tous');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [screen, setScreen] = useState('main');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [batch, setBatch] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const visiblePrograms = selectedType === 'Tous'
    ? programs
    : programs.filter((program) => program.type === selectedType);

  const savePrograms = async (nextPrograms) => {
    setIsSaving(true);
    try {
      return await onUpdatePrograms(nextPrograms);
    } finally {
      setIsSaving(false);
    }
  };

  const resetAddScreen = () => {
    setBatch([]);
    setForm(EMPTY_FORM);
    setScreen('main');
  };

  const validateForm = () => {
    if (!form.name.trim() || !form.type || !form.result) return false;
    if (form.dateMode === 'single') return Boolean(form.date);
    return Boolean(form.dateFrom && form.dateTo && form.dateFrom <= form.dateTo);
  };

  const handleImagePick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const image = await compressImageFile(file);
      setForm((prev) => ({ ...prev, image }));
    } catch (error) {
      alert(error.message);
    }
  };

  const handleAddToBatch = () => {
    if (!validateForm()) {
      alert('Veuillez compléter les champs obligatoires.');
      return;
    }

    const nextProgram = normalizeProgram(form);
    setBatch((prev) => [...prev, nextProgram]);
    setForm(EMPTY_FORM);
  };

  const handleSaveBatch = async () => {
    if (!batch.length) {
      alert('Ajoutez au moins un programme avant d enregistrer.');
      return;
    }

    const saved = await savePrograms([...programs, ...batch]);
    if (saved) {
      setSelectedType('Tous');
      resetAddScreen();
    }
  };

  const handleRemoveProgram = async (targetIndex) => {
    const program = programs[targetIndex];
    if (!program) return;
    const confirmed = window.confirm(`Supprimer "${program.name}" ?`);
    if (!confirmed) return;

    const saved = await savePrograms(programs.filter((_, index) => index !== targetIndex));
    if (saved && selectedType !== 'Tous' && (typeCounts[selectedType] || 0) <= 1) {
      setSelectedType('Tous');
    }
  };

  const openDetails = (program, index) => {
    if (deleteMode) {
      handleRemoveProgram(index);
      return;
    }
    setSelectedProgram({ ...program, index });
    setScreen('details');
  };

  if (screen === 'add') {
    return (
      <div className="section-card p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h4 className="text-[16px] font-bold text-white">Ajouter des programmes</h4>
            <p className="text-[12px] text-white/40 mt-1">Les programmes restent en attente jusqu'à Enregistrer.</p>
          </div>
          <button
            onClick={resetAddScreen}
            className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.06] text-[12px] font-bold transition-colors cursor-pointer"
          >
            Retour
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 min-h-[340px]">
            <h5 className="text-[12px] font-bold text-white/40 uppercase tracking-[2px] mb-4">Ajoutés pendant cette session</h5>
            {batch.length > 0 ? (
              <div className="space-y-3">
                {batch.map((program, index) => (
                  <div key={`${program.name}-${index}`} className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-white truncate">{program.name}</p>
                        <p className="text-[11px] text-white/40 mt-1">{program.type} - {program.result}</p>
                      </div>
                      <button
                        onClick={() => setBatch((prev) => prev.filter((_, i) => i !== index))}
                        className="w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
                        aria-label="Retirer de la session"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {formatProgramDate(program) && <p className="text-[11px] text-white/40 mt-2">{formatProgramDate(program)}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full min-h-[230px] flex items-center justify-center border border-dashed border-white/10 rounded-xl">
                <p className="text-[12px] text-white/35">Aucun programme ajouté dans cette session.</p>
              </div>
            )}
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-4 h-fit">
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
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={3}
                className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 outline-none focus:border-accent-blue/50 resize-none"
              />
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Image</span>
              <input id="admin-program-image" type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
              <label htmlFor="admin-program-image" className="w-full text-center py-3 rounded-lg border border-dashed border-white/15 bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.06] text-[12px] font-bold transition-colors cursor-pointer">
                {form.image ? 'Changer image' : 'Ajouter image'}
              </label>
              {form.image && <img src={form.image} alt="" className="mt-3 w-full h-32 object-cover rounded-xl border border-white/10" />}
            </div>

            <div className="space-y-3">
              <span className="block text-[10px] font-bold text-white/40 uppercase tracking-[2px] ml-1">Date</span>
              <div className="grid grid-cols-2 gap-2 p-1 bg-white/[0.03] border border-white/10 rounded-xl">
                {[
                  ['single', 'Date'],
                  ['range', 'Du - Au']
                ].map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setForm((prev) => ({ ...prev, dateMode: mode }))}
                    className={`rounded-lg py-2 text-[11px] font-bold transition-colors ${
                      form.dateMode === mode ? 'bg-accent-blue text-white' : 'text-white/45 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {form.dateMode === 'single' ? (
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50"
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={form.dateFrom}
                    onChange={(event) => setForm((prev) => ({ ...prev, dateFrom: event.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50"
                  />
                  <input
                    type="date"
                    value={form.dateTo}
                    min={form.dateFrom || undefined}
                    onChange={(event) => setForm((prev) => ({ ...prev, dateTo: event.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50"
                  />
                </div>
              )}
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

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleAddToBatch}
                disabled={isSaving}
                className="py-3 rounded-lg border border-white/10 bg-white/[0.04] text-white text-[12px] font-bold hover:bg-white/[0.08] transition-colors disabled:opacity-40"
              >
                Ajouter
              </button>
              <button
                onClick={handleSaveBatch}
                disabled={isSaving || !batch.length}
                className="py-3 rounded-lg bg-accent-blue text-white text-[12px] font-bold hover:brightness-110 transition-all disabled:opacity-40"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'details' && selectedProgram) {
    const dateLabel = formatProgramDate(selectedProgram);
    return (
      <div className="section-card p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h4 className="text-[16px] font-bold text-white">{selectedProgram.name}</h4>
            <p className="text-[12px] text-white/40 mt-1">Détails du programme</p>
          </div>
          <button
            onClick={() => {
              setSelectedProgram(null);
              setScreen('main');
            }}
            className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.06] text-[12px] font-bold transition-colors cursor-pointer"
          >
            Retour
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-5">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-3">
            {selectedProgram.image && <img src={selectedProgram.image} alt="" className="w-full h-48 object-cover rounded-xl border border-white/10 mb-4" />}
            <p className="text-[10px] font-bold text-white/35 uppercase tracking-[2px]">Description</p>
            <p className="text-[14px] text-white/75 leading-relaxed">{selectedProgram.description || 'Aucune description.'}</p>
          </div>
          <div className="space-y-3">
            {[
              ['Type', selectedProgram.type],
              ['Résultat', selectedProgram.result],
              ['Date', dateLabel || '-']
            ].map(([label, value]) => (
              <div key={label} className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
                <p className="text-[10px] font-bold text-white/35 uppercase tracking-[2px]">{label}</p>
                <p className="text-[13px] font-bold text-white mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-card p-6 space-y-6">
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center justify-between border-b border-white/10 pb-5">
        <h4 className="text-[16px] font-bold text-white">Programmes</h4>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowTypeMenu((prev) => !prev)}
              className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white/70 hover:text-white hover:bg-white/[0.06] text-[12px] font-bold transition-colors cursor-pointer"
            >
              Type
            </button>
            {showTypeMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#151b2e] border border-white/10 rounded-xl shadow-2xl p-2 z-50">
                {['Tous', ...PROGRAM_TYPES].map((type) => {
                  const count = type === 'Tous' ? programs.length : typeCounts[type] || 0;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedType(type);
                        setShowTypeMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] font-bold transition-colors ${
                        selectedType === type ? 'bg-accent-blue/15 text-accent-blue' : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      <span>{type}</span>
                      <span>({count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={() => setDeleteMode((prev) => !prev)}
            className={`px-4 py-2 rounded-lg border text-[12px] font-bold transition-colors cursor-pointer ${
              deleteMode
                ? 'bg-accent-red/10 text-accent-red border-accent-red/30'
                : 'bg-white/[0.03] text-white/70 hover:text-white hover:bg-white/[0.06] border-white/10'
            }`}
          >
            Supprimer
          </button>
          <button
            onClick={() => setScreen('add')}
            className="px-4 py-2 rounded-lg bg-accent-blue text-white text-[12px] font-bold hover:brightness-110 transition-all cursor-pointer"
          >
            Ajouter
          </button>
        </div>
      </div>

      {visiblePrograms.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {visiblePrograms.map((program) => {
            const originalIndex = programs.indexOf(program);
            const style = CHIP_STYLES[originalIndex % CHIP_STYLES.length];
            return (
              <button
                key={`${program.name}-${program.type}-${originalIndex}`}
                onClick={() => openDetails(program, originalIndex)}
                disabled={isSaving}
                className={`group inline-flex max-w-full items-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] font-black transition-all cursor-pointer disabled:opacity-40 ${style}`}
              >
                <span className="truncate">{program.name}</span>
                {deleteMode && (
                  <span className="w-5 h-5 rounded-md bg-black/15 flex items-center justify-center">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-xl">
          <p className="text-[12px] text-white/50">Aucun programme.</p>
        </div>
      )}
    </div>
  );
}
