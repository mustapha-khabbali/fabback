import { useApp } from '../../../context/AppContext';

export default function ArticlePending({ onBack }) {
  const { userArticles } = useApp();

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] lg:bg-t-surface-alt/50">
      <div className="pt-10 pb-6 px-6 shrink-0 lg:max-w-4xl lg:mx-auto lg:w-full lg:pt-16 lg:px-12 lg:mb-4">
        <div className="flex items-center space-x-4 lg:space-x-6">
          <button onClick={onBack} className="p-2 -ml-2 text-t-tertiary hover:text-t-primary transition-colors lg:bg-t-surface-alt lg:rounded-full lg:shadow-sm lg:p-3 lg:-ml-0 lg:hover:shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-2xl font-bold text-t-primary lg:text-4xl">Mes Demandes</h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-24 lg:px-12 lg:pb-32">
        <div className="space-y-4 lg:max-w-4xl lg:mx-auto lg:w-full lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
          {userArticles.length === 0 ? (
            <div className="text-center py-10 text-t-muted italic text-sm lg:col-span-2 lg:py-20 lg:text-lg">Aucune demande en cours</div>
          ) : (
            userArticles.map(a => (
              <div key={a.id} className="bg-t-surface p-5 rounded-3xl shadow-sm border border-t-border space-y-4 lg:p-8 lg:rounded-[32px] lg:shadow-md lg:hover:shadow-lg lg:transition-shadow flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="font-bold text-t-primary">{a.title}</h4>
                    <p className="text-[10px] text-t-tertiary uppercase tracking-widest">{new Date(a.date).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                    a.status === 'Validé' ? 'bg-emerald-50 text-emerald-600' :
                    a.status === 'Refusé' ? 'bg-red-50 text-red-600' :
                    'bg-orange-50 text-orange-600'
                  }`}>{a.status}</span>
                </div>
                <p className="text-xs text-t-secondary leading-relaxed">{a.description}</p>
                {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="block text-[10px] font-bold text-[#3B5FE6] hover:underline truncate">Lien article →</a>}
                {a.image && <div className="w-full h-32 rounded-2xl overflow-hidden mt-2 lg:h-48"><img src={a.image} className="w-full h-full object-cover" alt={a.title} /></div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
