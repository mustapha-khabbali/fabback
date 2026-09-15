import { useState } from 'react';
import Portal from '../../common/Portal';
import ImageLightbox from '../../common/ImageLightbox';

export default function JournalReaderModal({ activeJournal, onClose, onEdit, onDelete }) {
  const [zoomImage, setZoomImage] = useState(false);
  if (!activeJournal) return null;

  const phaseLabel = activeJournal.phase
    ? (activeJournal.phase === 'IDEA' ? 'MOC' : activeJournal.phase).replace(/_/g, ' ')
    : null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[250] bg-t-surface flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Sticky header — respects the notch / status bar via safe-area padding */}
        <header
          className="sticky top-0 z-30 bg-t-surface/95 backdrop-blur border-b border-t-border shrink-0"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex items-center justify-between px-4 h-14">
            <button
              onClick={onClose}
              aria-label="Retour"
              className="flex items-center gap-1 -ml-1 pr-2 py-2 text-t-primary/80 hover:text-t-primary active:scale-95 transition-all font-bold text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Retour</span>
            </button>

            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(activeJournal)}
                  aria-label="Modifier"
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-[#3B5FE6]/10 text-[#3B5FE6] active:scale-90 transition-all"
                >
                  <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(activeJournal)}
                  aria-label="Supprimer"
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 active:scale-90 transition-all"
                >
                  <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable body — safe-area padding at the bottom for the home indicator */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar bg-t-surface"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 3rem)' }}
        >
          <div className="mx-auto w-full max-w-2xl px-5 sm:px-8 pt-6">
            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-[#3B5FE6] bg-[#3B5FE6]/10 px-3 py-1.5 rounded-full">
                {new Date(activeJournal.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              {phaseLabel && (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full uppercase tracking-wide">
                  {phaseLabel}{activeJournal.version ? ` · v${activeJournal.version}` : ''}
                </span>
              )}
            </div>

            {/* Hero image at the top — where the eye lands first on a phone.
                Tap to open full-screen. */}
            {activeJournal.image && (
              <button
                type="button"
                onClick={() => setZoomImage(true)}
                className="mt-5 block w-full rounded-3xl overflow-hidden bg-t-surface-alt shadow-sm active:scale-[0.99] transition-transform"
              >
                <img
                  src={activeJournal.image}
                  className="w-full max-h-[60vh] object-contain"
                  alt="Photo du journal"
                />
              </button>
            )}

            {/* Content */}
            <article
              className="mt-6 text-t-primary text-[16px] leading-[1.75] font-medium space-y-4 rich-text-content break-words [overflow-wrap:anywhere] max-w-none prose prose-indigo"
              dangerouslySetInnerHTML={{ __html: activeJournal.content }}
            />
          </div>
        </div>
      </div>

      {zoomImage && activeJournal.image && (
        <ImageLightbox src={activeJournal.image} alt="Photo du journal" onClose={() => setZoomImage(false)} />
      )}
    </Portal>
  );
}
