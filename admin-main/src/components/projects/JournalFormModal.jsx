import { useState } from 'react';
import RichTextEditor from '../common/RichTextEditor';

export default function JournalFormModal({ journal, defaultPhase = 'MOC', onSave, onBack }) {
  const [date, setDate] = useState(journal ? journal.date : new Date().toISOString().split('T')[0]);
  const [phase, setPhase] = useState(journal ? journal.phase : defaultPhase);
  const [version, setVersion] = useState(journal ? journal.version : 1);
  const [content, setContent] = useState(journal ? journal.content : '');
  const [image, setImage] = useState(journal ? journal.image : null);

  const hasContent = content.replace(/<[^>]*>/g, '').trim().length > 0;

  const previewImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!hasContent) return;
    onSave({
      ...(journal ? { id: journal.id } : {}),
      date,
      phase,
      version: Number(version) || 1,
      content,
      image
    });
  };

  return (
    <div className="section-card p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors cursor-pointer text-[12px] font-bold">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          <span>Retour</span>
        </button>
        <h4 className="text-[15px] font-bold text-white">{journal ? 'Modifier Journal' : 'Nouveau Journal'}</h4>
        <button
          onClick={handleSave}
          disabled={!hasContent}
          className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/85 disabled:opacity-30 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
        >
          Enregistrer
        </button>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Cover photo — shown first, exactly where it lands in the reader */}
        {image ? (
          <label className="group relative block w-full rounded-lg overflow-hidden cursor-pointer bg-white/[0.03]">
            <input type="file" className="hidden" accept="image/*" onChange={previewImage} />
            <img src={image} className="w-full h-auto max-h-[420px] object-contain mx-auto" alt="Preview" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-[11px] font-bold uppercase tracking-widest bg-black/60 px-4 py-2 rounded-lg">
                Changer la photo
              </span>
            </div>
          </label>
        ) : (
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-white/15 hover:border-accent-blue/40 text-white/40 hover:text-white/70 cursor-pointer transition-colors">
            <input type="file" className="hidden" accept="image/*" onChange={previewImage} />
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="text-[11px] font-bold uppercase tracking-wider">Ajouter une photo</span>
          </label>
        )}

        {/* Meta row — matches the badge order shown in the reader */}
        <div className="flex gap-3">
          <div className="flex flex-col flex-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50"
            />
          </div>
          <div className="flex flex-col flex-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Phase</span>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50 cursor-pointer"
            >
              <option value="MOC">MOC</option>
              <option value="POC">POC</option>
              <option value="MVP">MVP</option>
              <option value="READY_TO_MARKET">READY TO MARKET</option>
            </select>
          </div>
          <div className="flex flex-col w-24">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Version</span>
            <input
              type="number"
              min="1"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50 text-center"
            />
          </div>
        </div>

        <hr className="border-white/10" />

        {/* Body — same content that renders below the meta in the reader */}
        <RichTextEditor
          label="Compte-rendu"
          value={content}
          onChange={setContent}
          placeholder="Que s'est-il passé ?"
          maxLength={2000}
        />
      </div>
    </div>
  );
}
