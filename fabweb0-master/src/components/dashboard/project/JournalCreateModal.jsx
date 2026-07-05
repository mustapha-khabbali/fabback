import { useState } from 'react';
import RichTextEditor from '../../common/RichTextEditor';

export default function JournalCreateModal({ onSave, onCancel, journal = null, defaultPhase = 'MOC' }) {
  const [tempImage, setTempImage] = useState(journal ? journal.image : null);
  const [date, setDate] = useState(journal ? journal.date : new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState(journal ? journal.content : '');
  const [phase, setPhase] = useState(journal ? (journal.phase === 'IDEA' ? 'MOC' : journal.phase) : (defaultPhase === 'IDEA' ? 'MOC' : defaultPhase));
  const [version, setVersion] = useState(journal ? journal.version : '1');

  const previewImage = (input) => {
    const file = input.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setTempImage(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    if (!plainText) return;
    onSave(date, content, tempImage, phase, version);
  };

  return (
    <div className="fixed inset-0 z-[260] bg-t-surface-alt flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Premium Sticky Header */}
      <header className="sticky top-0 z-30 bg-t-surface border-b border-t-border px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <button
          onClick={onCancel}
          className="flex items-center space-x-2 text-t-primary/70 hover:text-t-primary transition-colors font-bold text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Annuler</span>
        </button>

        <h3 className="text-base font-bold text-t-primary tracking-tight">
          {journal ? 'Modifier Journal' : 'Nouveau Journal'}
        </h3>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-[#3B5FE6] text-white rounded-full text-xs font-bold shadow-md hover:bg-[#3B5FE6]/90 transition-all active:scale-95"
        >
          Enregistrer
        </button>
      </header>

      {/* Main Form Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar bg-t-surface">
        <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full p-4 bg-t-surface-alt border border-transparent rounded-2xl focus:bg-t-surface focus:border-midnight-blue outline-none transition-all font-bold text-t-primary" />
            </div>

            <div className="flex items-end gap-4 w-full">
              <div className="flex-1 space-y-1.5 min-w-0">
                <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Phase</label>
                <select value={phase} onChange={e => setPhase(e.target.value)}
                  className="w-full p-4 bg-t-surface-alt border border-transparent rounded-2xl focus:bg-t-surface focus:border-midnight-blue outline-none transition-all font-bold text-t-primary appearance-none">
                  <option value="MOC">MOC</option>
                  <option value="POC">POC</option>
                  <option value="MVP">MVP</option>
                  <option value="READY_TO_MARKET">READY TO MARKET</option>
                </select>
              </div>

              <div className="w-[80px] space-y-1.5 shrink-0">
                <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Version</label>
                <input type="number" min="1" value={version} onChange={e => setVersion(e.target.value)}
                  className="w-full p-4 bg-t-surface-alt border border-transparent rounded-2xl focus:bg-t-surface focus:border-midnight-blue outline-none transition-all font-bold text-t-primary text-center" />
              </div>
            </div>
          </div>

          <RichTextEditor
            label="Compte-rendu"
            value={content}
            onChange={setContent}
            placeholder="Que s'est-il passé aujourd'hui ?"
            maxLength={2000}
          />

          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest">Photo</span>
              <label className="cursor-pointer text-[#3B5FE6] text-[10px] font-bold uppercase hover:underline">
                <input type="file" className="hidden" accept="image/*" onChange={previewImage} />Sélectionner
              </label>
            </div>
            <div className="w-full h-48 bg-t-surface-alt rounded-2xl overflow-hidden border-2 border-dashed border-t-border flex items-center justify-center">
              {tempImage ? <img src={tempImage} className="w-full h-full object-cover" alt="Preview" /> : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
