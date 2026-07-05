import { useState } from 'react';
import ImageLightbox from './ImageLightbox';

export default function JournalReaderModal({ journal, onBack, onEdit, onDelete }) {
  const [showLightbox, setShowLightbox] = useState(false);
  if (!journal) return null;

  return (
    <div className="section-card p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors cursor-pointer text-[12px] font-bold">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          <span>Retour</span>
        </button>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(journal)}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent-blue hover:bg-accent-blue/85 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              Modifier
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(journal)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] hover:bg-accent-red/10 border border-white/10 hover:border-accent-red/30 text-white hover:text-accent-red text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Supprimer
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {journal.image && (
          <button
            onClick={() => setShowLightbox(true)}
            className="block w-full rounded-lg overflow-hidden mb-6 bg-white/[0.03] cursor-zoom-in"
          >
            <img src={journal.image} className="w-full h-auto max-h-[320px] object-contain mx-auto" alt="Journal" />
          </button>
        )}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-[10px] font-bold text-accent-blue uppercase bg-accent-blue/10 px-3 py-1.5 rounded-full">
            {new Date(journal.date || journal.timestamp).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-500/10 px-3 py-1.5 rounded-full">
            {(journal.phase || 'MOC').replace(/_/g, ' ')} {journal.version ? `v${journal.version}` : ''}
          </span>
        </div>
        <hr className="border-white/10 mb-6" />
        <div
          className="rich-text-content text-[14px] text-white/70 leading-[1.8] break-words"
          dangerouslySetInnerHTML={{ __html: journal.content }}
        />
      </div>

      {showLightbox && (
        <ImageLightbox src={journal.image} alt="Journal" onClose={() => setShowLightbox(false)} />
      )}
    </div>
  );
}
