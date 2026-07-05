import { useState } from 'react';
import { ALL_SDGS } from '../../utils/projectUtils';

export default function SdgModal({ sdgIds, onSave, onClose }) {
  const [selected, setSelected] = useState(sdgIds || []);

  const toggle = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else {
      if (selected.length >= 3) return;
      setSelected([...selected, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#151b2e] border border-white/10 rounded-2xl shadow-2xl p-7 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[16px] font-bold text-white">Objectifs (SDG)</h3>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-5">Sélectionner jusqu'à 3 objectifs</p>

        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mb-6">
          {ALL_SDGS.map((sdg) => {
            const isSelected = selected.includes(sdg.id);
            return (
              <button
                key={sdg.id}
                onClick={() => toggle(sdg.id)}
                className={`aspect-square rounded-md overflow-hidden transition-all relative cursor-pointer ${isSelected ? 'ring-4 ring-accent-blue scale-95' : 'opacity-70 hover:opacity-100'}`}
              >
                <img src={sdg.image} className="w-full h-full object-cover" alt={`SDG ${sdg.number}`} />
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onSave(selected)}
          className="w-full bg-accent-blue hover:bg-accent-blue/85 text-white text-[13px] font-bold py-3 px-4 rounded-lg transition-colors cursor-pointer"
        >
          Enregistrer ({selected.length})
        </button>
      </div>
    </div>
  );
}
