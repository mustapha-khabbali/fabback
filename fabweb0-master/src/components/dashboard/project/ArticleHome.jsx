export default function ArticleHome({ onBack, onCreateArticle, onShowPending }) {
  return (
    <div className="flex flex-col h-full main-container lg:bg-t-surface-alt/50">
      <div className="pt-10 pb-6 px-6 lg:pt-16 lg:px-12">
        <div className="flex items-center space-x-4 lg:space-x-6">
          <button onClick={onBack} className="p-2 -ml-2 text-t-tertiary hover:text-t-primary transition-colors lg:bg-t-surface-alt lg:rounded-full lg:shadow-sm lg:p-3 lg:-ml-0 lg:hover:shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-2xl font-bold text-t-primary lg:text-4xl">Articles</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 lg:px-12 lg:py-8 lg:flex lg:items-center lg:justify-center">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-12 lg:max-w-6xl lg:w-full">
          <button onClick={onCreateArticle}
            className="w-full aspect-[16/9] bg-t-surface border border-t-border rounded-[40px] shadow-sm flex flex-col items-center justify-center space-y-4 hover:shadow-md transition-all active:scale-95 group lg:aspect-[4/3] lg:shadow-lg lg:hover:-translate-y-2 lg:duration-300 lg:rounded-[48px] lg:border-none">
            <div className="p-6 bg-blue-50 text-blue-500 rounded-[32px] group-hover:scale-110 transition-transform">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            </div>
            <div className="text-center">
              <span className="block text-sm font-black text-t-primary uppercase tracking-[0.15em]">Nouvelle demande</span>
              <span className="text-[10px] text-t-tertiary font-bold uppercase tracking-widest mt-1">Soumettre une requête</span>
            </div>
          </button>

          <button onClick={onShowPending}
            className="w-full aspect-[16/9] bg-t-surface border border-t-border rounded-[40px] shadow-sm flex flex-col items-center justify-center space-y-4 hover:shadow-md transition-all active:scale-95 group lg:aspect-[4/3] lg:shadow-lg lg:hover:-translate-y-2 lg:duration-300 lg:rounded-[48px] lg:border-none">
            <div className="p-6 bg-orange-50 text-orange-500 rounded-[32px] group-hover:scale-110 transition-transform">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="text-center">
              <span className="block text-sm font-black text-t-primary uppercase tracking-[0.15em]">Demandes en cours</span>
              <span className="text-[10px] text-t-tertiary font-bold uppercase tracking-widest mt-1">Suivre mes articles</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
