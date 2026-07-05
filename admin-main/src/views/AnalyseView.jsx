export default function AnalyseView({ onNavigate }) {
  return (
    <section>
      <div className="flex items-center space-x-4 mb-7 mt-2">
        <button
          onClick={() => onNavigate && onNavigate('dashboard')}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-card hover:bg-card-hover border border-white/[0.08] text-white transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98] shrink-0"
          title="Retour au Dashboard"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-[32px] font-bold text-white tracking-tight leading-none">Analyse</h1>
      </div>
      <div className="section-card p-10 text-center border border-dashed border-white/10 bg-white/[0.005]">
        <div className="max-w-md mx-auto py-12">
          <div className="text-5xl mb-4">📈</div>
          <h2 className="text-xl font-bold text-white mb-2">Analyse des Données</h2>
          <p className="text-[13px] text-white/40 leading-relaxed">
            Cette section affichera des graphiques interactifs et des analyses détaillées concernant la fréquentation, l'usage des machines, et les heures de présence des utilisateurs.
          </p>
          <p className="text-[11px] text-white/20 mt-6 uppercase tracking-widest font-bold">
            En cours de spécification...
          </p>
        </div>
      </div>
    </section>
  );
}
