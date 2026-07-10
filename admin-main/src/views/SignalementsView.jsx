import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { subscribeRealtime } from '../services/realtime';

const CATEGORY_LABELS = {
  disrespect: 'Manque de respect',
  cooperation: 'Mauvaise collaboration',
  copy: "Vol ou copie d'idée"
};

const STATUS_META = {
  nouveau: { label: 'Nouveau', className: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20' },
  valide: { label: 'Validé', className: 'bg-accent-red/10 text-accent-red border-accent-red/20' },
  rejete: { label: 'Rejeté', className: 'bg-white/[0.05] text-white/40 border-white/10' }
};

const FILTERS = [
  { id: 'nouveau', label: 'Nouveaux' },
  { id: 'all', label: 'Tous' },
  { id: 'valide', label: 'Validés' },
  { id: 'rejete', label: 'Rejetés' }
];

// Lab time, whatever the viewer's device is set to.
function formatLabDateTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Casablanca',
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date);
}

export default function SignalementsView({ onNavigate }) {
  const [filter, setFilter] = useState('nouveau');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api.getBehaviorReports(filter === 'all' ? undefined : filter)
      .then((rows) => setReports(rows))
      .catch((error) => alert(error.message))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => subscribeRealtime((change) => {
    if (change.entity === 'behavior' || change.entity === 'sync') load();
  }), [load]);

  const review = async (id, status) => {
    try {
      await api.reviewBehaviorReport(id, status);
      load();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <section>
      <div className="mb-7 mt-2">
        <p className="text-[12px] font-medium text-white/50 mb-1">Pages / Signalements</p>
        <h1 className="text-[32px] font-bold text-white tracking-tight">Signalements</h1>
        <p className="text-[12px] text-white/40 mt-1">
          Un signalement n'affecte le score de comportement qu'une fois validé. Les scores sont calculés automatiquement — aucune modification manuelle.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`px-4 py-2 rounded-xl text-[12px] font-bold border transition-colors ${
              filter === item.id
                ? 'bg-accent-red border-accent-red text-white'
                : 'bg-white/[0.02] border-white/10 text-white/50 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[13px] text-white/40">Chargement…</p>
      ) : reports.length === 0 ? (
        <div className="section-card p-8 text-center">
          <p className="text-[13px] text-white/50">Aucun signalement {filter === 'nouveau' ? 'en attente' : ''}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 max-w-3xl">
          {reports.map((report) => {
            const status = STATUS_META[report.status] || STATUS_META.nouveau;
            return (
              <div key={report.id} className="section-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="text-[13px] text-white/70">
                    <span className="font-bold text-white">{report.senderName || 'Utilisateur supprimé'}</span>
                    {' '}a signalé{' '}
                    <button
                      onClick={() => onNavigate?.('users', { userId: report.targetId, name: report.targetName })}
                      className="font-bold text-accent-blue hover:underline"
                    >
                      {report.targetName || 'Utilisateur supprimé'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${status.className}`}>{status.label}</span>
                    <span className="text-[10px] text-white/30 font-mono">{formatLabDateTime(report.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-red/10 text-accent-red border border-accent-red/20">
                    {CATEGORY_LABELS[report.category] || report.category}
                  </span>
                  {report.reviewedByName && report.status !== 'nouveau' && (
                    <span className="text-[10px] text-white/30">revu par {report.reviewedByName}</span>
                  )}
                </div>

                <p className="text-[12px] text-white/50 bg-white/[0.02] border-l-2 border-accent-red/50 rounded-r-lg p-3 italic leading-relaxed">
                  "{report.details}"
                </p>

                {report.status === 'nouveau' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => review(report.id, 'valide')}
                      className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest bg-accent-red/10 border border-accent-red/20 text-accent-red hover:bg-accent-red hover:text-white transition-colors"
                    >
                      Valider (applique la pénalité)
                    </button>
                    <button
                      onClick={() => review(report.id, 'rejete')}
                      className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest bg-white/[0.02] border border-white/10 text-white/50 hover:text-white transition-colors"
                    >
                      Rejeter
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
