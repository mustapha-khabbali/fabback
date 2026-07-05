import { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import RichTextEditor from '../../common/RichTextEditor';
import { getPrimaryUserId } from '../../../utils/userIdentity';

export default function ProjectCreateForm({ onBack }) {
  const { showNotification, userProjects, saveProjects, currentUser, recordPresenceActivity } = useApp();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const handleCreate = () => {
    // Basic validation on text content
    const plainText = desc.replace(/<[^>]*>/g, '').trim();
    if (!title || !plainText) {
      showNotification("Titre et description requis.", 'error');
      return;
    }
    const newProject = {
      id: crypto.randomUUID(),
      userId: getPrimaryUserId(currentUser),
      title, 
      description: desc, // Save as HTML
      image: null, 
      journals: [], 
      color: '#3B5FE6',
      supervisorIds: ['user-sara']
    };
    saveProjects([...userProjects, newProject]);
    recordPresenceActivity('project:create', {
      projectId: newProject.id,
      projectTitle: newProject.title
    });
    setTitle(''); 
    setDesc('');
    onBack();
  };

  return (
    <div className="flex flex-col space-y-6 p-6 lg:max-w-3xl lg:mx-auto lg:w-full lg:py-16">
      <div className="flex items-center space-x-4 pt-4 lg:pt-0 lg:mb-4">
        <button onClick={onBack} className="p-2 text-t-tertiary hover:text-t-primary transition-colors lg:bg-t-surface-alt lg:rounded-full lg:shadow-sm lg:p-3 lg:-ml-2 lg:hover:shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-2xl font-bold text-t-primary lg:text-3xl">Nouveau Projet</h2>
      </div>

      <div className="bg-t-surface rounded-[32px] p-6 shadow-sm border border-t-border space-y-6 lg:p-10 lg:shadow-xl lg:rounded-[40px] lg:space-y-8">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Titre du Projet</label>
          <input value={title} onChange={e => setTitle(e.target.value)} type="text" placeholder="Entrez le titre..."
            className="w-full p-4 bg-t-surface-alt border border-transparent rounded-2xl focus:bg-t-surface focus:border-midnight-blue outline-none transition-all font-bold text-t-primary" />
        </div>
        
        <RichTextEditor 
          label="Description"
          value={desc}
          onChange={setDesc}
          placeholder="Décrivez votre idée, vos objectifs..."
          maxLength={1000}
        />

        <button onClick={handleCreate}
          className="w-full py-5 bg-midnight-blue text-white font-bold text-lg rounded-2xl shadow-xl hover:brightness-110 active:scale-[0.98] transition-all">Créer le projet</button>
      </div>
    </div>
  );
}
