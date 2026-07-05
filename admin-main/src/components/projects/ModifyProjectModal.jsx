import { useState } from 'react';
import RichTextEditor from '../common/RichTextEditor';

export default function ModifyProjectModal({ project, onSave, onCancel }) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [image, setImage] = useState(project.image);

  const hasDescription = description.replace(/<[^>]*>/g, '').trim().length > 0;

  const previewImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#151b2e] border border-white/10 rounded-2xl shadow-2xl p-7 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-[16px] font-bold text-white mb-5">Modifier Projet</h3>

        <div className="space-y-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Titre</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px]">Image Principale</span>
            <label className="bg-accent-blue hover:bg-accent-blue/85 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-colors">
              <input type="file" className="hidden" accept="image/*" onChange={previewImage} />
              Changer
            </label>
          </div>
          {image && (
            <div className="w-full rounded-lg overflow-hidden bg-white/[0.03]">
              <img src={image} className="w-full h-auto max-h-[280px] object-contain mx-auto" alt="Project" />
            </div>
          )}

          <div className="flex flex-col space-y-2.5 pt-2">
            <button
              onClick={() => onSave(title, description, image)}
              disabled={!title.trim() || !hasDescription}
              className="w-full bg-accent-blue hover:bg-accent-blue/85 disabled:opacity-30 text-white text-[13px] font-bold py-3 px-4 rounded-lg transition-colors cursor-pointer"
            >
              Sauvegarder
            </button>
            <button
              onClick={onCancel}
              className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[13px] font-bold py-3 px-4 rounded-lg transition-colors cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
