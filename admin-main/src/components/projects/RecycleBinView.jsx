export default function RecycleBinView({ recycleBin, onRestore, onPermanentDelete, onBack }) {
  return (
    <div className="section-card p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/60 rounded-lg transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[2px]">Corbeille</h4>
      </div>

      {(!recycleBin || recycleBin.length === 0) ? (
        <div className="py-10 text-center text-white/20 italic text-[13px]">La corbeille est vide</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {recycleBin.map((item) => (
            <div key={item.id} className="bg-white/[0.05] border border-white/10 rounded-lg p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  {item.type === 'journal' ? (
                    <div className="w-full h-full bg-accent-blue/10 text-accent-blue rounded-lg flex items-center justify-center">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" />
                        <path d="M7 9H17" /><path d="M7 14H13" />
                      </svg>
                    </div>
                  ) : (
                    <svg className="w-full h-full text-[#FFCD29]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V8C22 6.89 21.11 6 20 6H12L10 4Z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-white truncate">
                    {item.type === 'journal'
                      ? `Journal (${new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })})`
                      : item.title}
                  </p>
                  {item.type === 'journal' && (
                    <p className="text-[10px] text-white/40 font-medium truncate">Projet: {item.projectName}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onRestore(item)} className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
                <button onClick={() => onPermanentDelete(item.id)} className="p-2 text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors cursor-pointer">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
