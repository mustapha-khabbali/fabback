import { useState } from 'react';
import RichTextEditor from '../common/RichTextEditor';

export default function ProjectCreateForm({ onCreate, onBack }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const hasDescription = description.replace(/<[^>]*>/g, '').trim().length > 0;

  const handleCreate = () => {
    if (!title.trim() || !hasDescription) return;
    onCreate({
      title: title.trim(),
      description,
      phase: 'MOC',
      journals: [],
      sdgIds: [],
      image: null
    });
  };

  return (
    <div className="section-card p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/60 rounded-lg transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[2px]">Nouveau Projet</h4>
      </div>

      <div className="space-y-4 max-w-xl">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Titre du Projet</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Entrez le titre..."
            className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50"
          />
        </div>

        <RichTextEditor
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="Décrivez l'idée, les objectifs..."
          maxLength={1000}
        />

        <button
          onClick={handleCreate}
          disabled={!title.trim() || !hasDescription}
          className="w-full bg-accent-blue hover:bg-accent-blue/85 disabled:opacity-30 text-white text-[13px] font-bold py-3 px-4 rounded-lg transition-colors cursor-pointer"
        >
          Créer le projet
        </button>
      </div>
    </div>
  );
}
