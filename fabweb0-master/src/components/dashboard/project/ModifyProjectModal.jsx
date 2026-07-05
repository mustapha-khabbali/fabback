import { useState } from 'react';
import RichTextEditor from '../../common/RichTextEditor';

export default function ModifyProjectModal({ project, onSave, onCancel, updateMainImage }) {
  const [editTitle, setEditTitle] = useState(project.title);
  const [editDesc, setEditDesc] = useState(project.description);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-midnight-blue/60 backdrop-blur-sm">
      <div className="bg-t-surface w-full max-w-lg rounded-[32px] p-8 shadow-2xl flex flex-col space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h3 className="text-2xl font-bold text-t-primary">Modifier Projet</h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Titre</label>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} type="text" className="w-full p-4 bg-t-surface-alt rounded-2xl outline-none focus:bg-t-surface focus:border-midnight-blue border border-transparent font-bold text-t-primary transition-all" />
          </div>

          <RichTextEditor 
            label="Description"
            value={editDesc}
            onChange={setEditDesc}
            placeholder="Décrivez votre idée..."
            maxLength={1000}
          />

          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest">Image Principale</span>
            <label className="bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase cursor-pointer hover:bg-blue-600 transition-colors">
              <input type="file" className="hidden" onChange={updateMainImage} />Changer
            </label>
          </div>
        </div>
        <div className="flex space-x-3 pt-2">
          <button onClick={onCancel} className="flex-1 py-4 bg-t-surface-input text-t-primary font-bold rounded-2xl hover:bg-gray-200 transition-colors">Annuler</button>
          <button onClick={() => onSave(editTitle, editDesc)} className="flex-1 py-4 bg-midnight-blue text-white font-bold rounded-2xl shadow-lg shadow-midnight-blue/20 hover:brightness-110 active:scale-95 transition-all">Sauvegarder</button>
        </div>
      </div>
    </div>
  );
}
