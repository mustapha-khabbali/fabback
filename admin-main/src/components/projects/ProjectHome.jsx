import { useState } from 'react';

export default function ProjectHome({ projects, onOpenProject, onCreateProject, onShowRecycle, onMoveToRecycle }) {
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleDeleteMode = () => {
    setIsDeleteMode(!isDeleteMode);
    setSelectedIds([]);
  };

  const handleFolderClick = (id) => {
    if (isDeleteMode) {
      setSelectedIds(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]);
      return;
    }
    onOpenProject(id);
  };

  const confirmDelete = () => {
    if (selectedIds.length === 0) {
      setIsDeleteMode(false);
      return;
    }
    onMoveToRecycle(selectedIds);
    setSelectedIds([]);
    setIsDeleteMode(false);
  };

  return (
    <div className="section-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[2px]">Dossiers Projets</h4>
        <div className="flex items-center gap-2">
          {isDeleteMode && (
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-accent-red text-white text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-lg cursor-pointer"
            >
              Confirmer ({selectedIds.length})
            </button>
          )}
          <button
            onClick={onCreateProject}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent-blue hover:bg-accent-blue/85 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Créer
          </button>
          <button
            onClick={toggleDeleteMode}
            className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-colors cursor-pointer ${
              isDeleteMode ? 'bg-accent-red/10 border-accent-red/30 text-accent-red' : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            {isDeleteMode ? 'Annuler' : 'Supprimer'}
          </button>
          <button
            onClick={onShowRecycle}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Bin
          </button>
        </div>
      </div>

      {(!projects || projects.length === 0) ? (
        <div className="py-10 text-center text-white/20 italic text-[13px]">Aucun projet</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
          {projects.map((project) => {
            const isSelected = selectedIds.includes(project.id);
            return (
              <button
                key={project.id}
                onClick={() => handleFolderClick(project.id)}
                className={`flex flex-col items-center space-y-2 group transition-all active:scale-95 cursor-pointer ${isSelected ? 'scale-90 opacity-70' : ''}`}
              >
                <div className={`w-full aspect-square flex items-center justify-center transition-transform duration-300 relative group-hover:scale-105 ${isSelected ? 'ring-4 ring-accent-red rounded-3xl' : ''}`}>
                  <svg className={`w-full h-full drop-shadow-md ${isSelected ? 'text-accent-red/70' : 'text-[#FFCD29]'}`} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V8C22 6.89 21.11 6 20 6H12L10 4Z" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center pt-2">
                    {isSelected ? (
                      <svg className="h-6 w-6 text-accent-red" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className={`text-[11px] font-bold text-center w-full px-1 break-words ${isSelected ? 'text-accent-red' : 'text-white/80'}`}>{project.title}</span>
                {project.phase && (
                  <span className="px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider bg-accent-blue/10 text-accent-blue">
                    {project.phase}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
