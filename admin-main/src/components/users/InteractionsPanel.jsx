import { useState } from 'react';

export default function InteractionsPanel({ user, usersList }) {
  const interactions = user.interactions || {
    reviewedOthers: [],
    helpedOthers: [],
    helpedBy: [],
    reviewedByOthers: []
  };

  const [activeCategory, setActiveCategory] = useState('all');

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-3.5 h-3.5 ${
              i < Math.floor(rating) ? 'text-accent-amber fill-accent-amber' : 'text-white/20'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        {rating > 0 && <span className="text-[10px] text-white/50 ml-1">({rating})</span>}
      </div>
    );
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const renderEmptyState = (message) => (
    <div className="py-8 text-center text-white/20 italic text-[13px] border border-white/5 bg-white/[0.01] rounded-2xl">
      {message}
    </div>
  );

  return (
    <div className="section-card p-6 space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[2px]">Réseau d'Interactions</h4>
          <p className="text-[13px] text-white/50 mt-1">
            Visualisez les activités collaboratives et les évaluations de {user.prenom} {user.nom}.
          </p>
        </div>

        {/* Filter Quick Tabs */}
        <div className="flex flex-wrap gap-1 p-1 bg-white/[0.03] border border-white/10 rounded-xl w-fit">
          {['all', 'reviews', 'help'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                activeCategory === cat ? 'bg-accent-blue text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {cat === 'all' ? 'Tout' : cat === 'reviews' ? 'Évaluations' : 'Entraide'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: REVIEWS DONE */}
        {(activeCategory === 'all' || activeCategory === 'reviews') && (
          <div className="space-y-4">
            <h5 className="text-[11px] font-bold text-accent-blue uppercase tracking-[1.5px] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-blue"></span>
              Projets Évalués (Qui a été évalué)
            </h5>
            {interactions.reviewedOthers.length === 0 ? (
              renderEmptyState("Aucune évaluation soumise")
            ) : (
              <div className="space-y-3">
                {interactions.reviewedOthers.map((item, idx) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-3 hover:bg-white/[0.04] transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue flex items-center justify-center font-bold text-[12px] shrink-0">
                      {getInitials(item.userName)}
                    </div>
                    <div className="space-y-2 flex-grow min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h6 className="text-[13px] font-semibold text-white truncate">{item.userName}</h6>
                          <p className="text-[11px] text-white/40 truncate mt-0.5">{item.projectTitle}</p>
                        </div>
                        <span className="text-[10px] text-white/30 shrink-0">{item.date}</span>
                      </div>
                      
                      {/* Rating & Status */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {renderStars(item.rating)}
                        <span className="px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider bg-accent-green/10 text-accent-green">
                          {item.result}
                        </span>
                      </div>

                      {item.comment && (
                        <p className="text-[12px] text-white/60 bg-white/[0.02] border border-white/5 rounded-xl p-2.5 italic">
                          "{item.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: REVIEWS RECEIVED */}
        {(activeCategory === 'all' || activeCategory === 'reviews') && (
          <div className="space-y-4">
            <h5 className="text-[11px] font-bold text-accent-purple uppercase tracking-[1.5px] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-purple"></span>
              Évaluations Reçues (Qui l'a évalué)
            </h5>
            {interactions.reviewedByOthers.length === 0 ? (
              renderEmptyState("Aucune évaluation reçue")
            ) : (
              <div className="space-y-3">
                {interactions.reviewedByOthers.map((item, idx) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-3 hover:bg-white/[0.04] transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/20 text-accent-purple flex items-center justify-center font-bold text-[12px] shrink-0">
                      {getInitials(item.userName)}
                    </div>
                    <div className="space-y-2 flex-grow min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h6 className="text-[13px] font-semibold text-white truncate">{item.userName}</h6>
                          <p className="text-[11px] text-white/40 truncate mt-0.5">{item.projectTitle}</p>
                        </div>
                        <span className="text-[10px] text-white/30 shrink-0">{item.date}</span>
                      </div>
                      
                      {/* Rating & Status */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {renderStars(item.rating)}
                        <span className="px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider bg-accent-purple/10 text-accent-purple">
                          {item.result}
                        </span>
                      </div>

                      {item.comment && (
                        <p className="text-[12px] text-white/60 bg-white/[0.02] border border-white/5 rounded-xl p-2.5 italic">
                          "{item.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: HELPED OTHERS */}
        {(activeCategory === 'all' || activeCategory === 'help') && (
          <div className="space-y-4">
            <h5 className="text-[11px] font-bold text-accent-green uppercase tracking-[1.5px] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green"></span>
              Entraide Apportée (Qui a été aidé)
            </h5>
            {interactions.helpedOthers.length === 0 ? (
              renderEmptyState("Aucun coup de main enregistré")
            ) : (
              <div className="space-y-3">
                {interactions.helpedOthers.map((item, idx) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-3 hover:bg-white/[0.04] transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green flex items-center justify-center font-bold text-[12px] shrink-0">
                      {getInitials(item.userName)}
                    </div>
                    <div className="space-y-1 flex-grow min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h6 className="text-[13px] font-semibold text-white truncate">{item.userName}</h6>
                        <span className="text-[10px] text-white/30 shrink-0">{item.date}</span>
                      </div>
                      <p className="text-[12px] text-white/70">
                        <span className="text-white/40 font-semibold mr-1">Tâche:</span>
                        {item.task}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: HELPED BY */}
        {(activeCategory === 'all' || activeCategory === 'help') && (
          <div className="space-y-4">
            <h5 className="text-[11px] font-bold text-accent-amber uppercase tracking-[1.5px] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-amber"></span>
              Entraide Reçue (Qui a aidé)
            </h5>
            {interactions.helpedBy.length === 0 ? (
              renderEmptyState("Aucune aide reçue")
            ) : (
              <div className="space-y-3">
                {interactions.helpedBy.map((item, idx) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-3 hover:bg-white/[0.04] transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-accent-amber/10 border border-accent-amber/20 text-accent-amber flex items-center justify-center font-bold text-[12px] shrink-0">
                      {getInitials(item.userName)}
                    </div>
                    <div className="space-y-1 flex-grow min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h6 className="text-[13px] font-semibold text-white truncate">{item.userName}</h6>
                        <span className="text-[10px] text-white/30 shrink-0">{item.date}</span>
                      </div>
                      <p className="text-[12px] text-white/70">
                        <span className="text-white/40 font-semibold mr-1">Sujet:</span>
                        {item.task}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
