export default function JournalReaderModal({ activeJournal, onClose, onEdit, onDelete }) {
  if (!activeJournal) return null;

  return (
    <div className="fixed inset-0 z-[250] bg-t-surface-alt flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Premium Sticky Header */}
      <header className="sticky top-0 z-30 bg-t-surface border-b border-t-border px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <button
          onClick={onClose}
          className="flex items-center space-x-2 text-t-primary/70 hover:text-t-primary transition-colors font-bold text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Retour</span>
        </button>

        <div className="flex items-center space-x-3">
          {onEdit && (
            <button
              onClick={() => onEdit(activeJournal)}
              className="px-4 py-2 bg-[#3B5FE6] text-white rounded-full text-xs font-bold shadow-md hover:bg-[#3B5FE6]/90 transition-all flex items-center space-x-1.5 active:scale-95"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Modifier</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(activeJournal)}
              className="px-4 py-2 bg-red-500 text-white rounded-full text-xs font-bold shadow-md hover:bg-red-600 transition-all flex items-center space-x-1.5 active:scale-95"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Supprimer</span>
            </button>
          )}
        </div>
      </header>

      {/* Main scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar bg-t-surface">
        <div className="max-w-3xl mx-auto w-full pb-24">
          {/* Article Container */}
          <div className="px-6 md:px-8 pt-8 space-y-6">
            {/* Metadata Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-[#3B5FE6] uppercase bg-blue-50 px-3 py-1.5 rounded-full">
                {new Date(activeJournal.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              {activeJournal.phase && (
                <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-3 py-1.5 rounded-full">
                  {(activeJournal.phase === 'IDEA' ? 'MOC' : activeJournal.phase).replace(/_/g, ' ')} {activeJournal.version ? `v${activeJournal.version}` : ''}
                </span>
              )}
            </div>

            {/* Separator */}
            <hr className="border-t-border" />

            {/* Article Content */}
            <article 
              className="text-t-primary text-[15px] md:text-[17px] leading-[1.8] font-medium space-y-5 rich-text-content break-words overflow-wrap-anywhere max-w-none prose prose-indigo"
              dangerouslySetInnerHTML={{ __html: activeJournal.content }}
            />

            {/* Photo at the bottom */}
            {activeJournal.image && (
              <div className="w-full rounded-2xl overflow-hidden shadow-sm mt-6">
                <img src={activeJournal.image} className="w-full h-auto max-h-[500px] object-contain bg-t-surface-alt mx-auto" alt="Journal" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
