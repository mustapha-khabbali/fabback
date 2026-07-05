export default function ConfirmModal({ icon, iconBg, iconColor, title, description, confirmLabel, danger = false, onConfirm, onCancel }) {
  const confirmClass = danger
    ? 'bg-accent-red hover:bg-accent-red/85'
    : 'bg-accent-blue hover:bg-accent-blue/85';
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#151b2e] border border-white/10 rounded-2xl shadow-2xl p-7 animate-in fade-in zoom-in-95 duration-200">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${iconBg}`}>
          <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            {icon}
          </svg>
        </div>
        <h3 className="text-[16px] font-bold text-white mb-2">{title}</h3>
        <p className="text-[13px] text-white/50 leading-relaxed mb-6">{description}</p>
        <div className="flex flex-col space-y-2.5">
          <button
            onClick={onConfirm}
            className={`w-full ${confirmClass} text-white text-[13px] font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[13px] font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
