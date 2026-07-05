import { PHASE_ORDER } from '../../utils/projectUtils';

export default function PhaseModal({ currentPhase, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#151b2e] border border-white/10 rounded-2xl shadow-2xl p-7 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-bold text-white">Phase du Projet</h3>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PHASE_ORDER.map((p) => (
            <button
              key={p}
              onClick={() => onSelect(p)}
              className={`px-4 py-3 rounded-lg text-[11px] font-black tracking-widest uppercase transition-all cursor-pointer ${
                currentPhase === p
                  ? 'bg-accent-blue text-white shadow-sm'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/60'
              }`}
            >
              {p.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
