import { useApp } from '../../../context/AppContext';

export default function RecycleBin({ onBack }) {
  const { recycleBin, saveRecycleBin, userProjects, saveProjects, showNotification } = useApp();

  const restore = (item) => {
    const isJournal = item.type === 'journal';
    const isMember = item.type === 'member';

    if (isJournal) {
      const originalProject = userProjects.find(p => p.id === item.projectId);
      if (!originalProject) {
        showNotification("Impossible de restaurer : le projet original n'existe plus.", 'error');
        return;
      }
      
      const journalData = { ...item };
      delete journalData.type;
      delete journalData.projectId;
      delete journalData.projectName;
      delete journalData.deletedAt;
      
      const updatedProjects = userProjects.map(p => 
        p.id === item.projectId ? { ...p, journals: [journalData, ...p.journals] } : p
      );
      saveProjects(updatedProjects);
      saveRecycleBin(recycleBin.filter(i => i.id !== item.id));
      showNotification("Journal restauré");
    } else if (isMember) {
      const originalProject = userProjects.find(p => p.id === item.projectId);
      if (!originalProject) {
        showNotification("Impossible de restaurer : le projet original n'existe plus.", 'error');
        return;
      }
      const restoredMember = { ...item.memberData, status: 'ACCEPTED' };
      const updatedProjects = userProjects.map(p => 
        p.id === item.projectId ? { ...p, contributors: [...(p.contributors || []), restoredMember] } : p
      );
      saveProjects(updatedProjects);
      saveRecycleBin(recycleBin.filter(i => i.id !== item.id));
      showNotification("Membre d'équipe restauré");
    } else {
      saveProjects([item, ...userProjects]);
      saveRecycleBin(recycleBin.filter(i => i.id !== item.id));
      showNotification("Projet restauré");
    }
  };

  const permanentDelete = (id) => {
    if (confirm("Supprimer définitivement ?")) {
      saveRecycleBin(recycleBin.filter(p => p.id !== id));
    }
  };

  return (
    <div className="flex flex-col h-full main-container lg:bg-t-surface-alt/50">
      <div className="pt-10 pb-6 px-6 shrink-0 lg:max-w-4xl lg:mx-auto lg:w-full lg:pt-16 lg:px-12 lg:mb-4">
        <div className="flex items-center space-x-4 lg:space-x-6">
          <button onClick={onBack} className="p-2 -ml-2 text-t-tertiary hover:text-t-primary transition-colors lg:bg-t-surface-alt lg:rounded-full lg:shadow-sm lg:p-3 lg:-ml-0 lg:hover:shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-2xl font-bold text-t-primary lg:text-4xl">Corbeille</h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-24 lg:px-12 lg:pb-32">
        <div className="space-y-4 lg:max-w-4xl lg:mx-auto lg:w-full lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
          {recycleBin.length === 0 ? (
            <div className="text-center py-10 text-t-muted italic text-sm lg:col-span-2 lg:py-20 lg:text-lg">La corbeille est vide</div>
          ) : (
            recycleBin.map(item => (
              <div key={item.id} className="bg-t-surface p-4 rounded-3xl shadow-sm border border-t-border flex items-center justify-between lg:p-6 lg:rounded-[32px] lg:shadow-md lg:hover:shadow-lg lg:transition-shadow">
                <div className="flex items-center space-x-3 lg:space-x-4">
                  <div className="w-10 h-10 flex items-center justify-center shrink-0 relative lg:w-16 lg:h-16">
                    {item.type === 'journal' ? (
                      <div className="w-full h-full bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" />
                          <path d="M7 9H17" /><path d="M7 14H13" />
                        </svg>
                      </div>
                    ) : item.type === 'member' ? (
                      <div className="w-full h-full bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    ) : (
                      <svg className="w-full h-full text-[#FFCD29]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V8C22 6.89 21.11 6 20 6H12L10 4Z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-t-primary break-words lg:text-lg">
                      {item.type === 'journal' 
                        ? `Journal (${new Date(item.date).toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit'})})` 
                        : item.type === 'member'
                          ? `Membre: ${item.memberData?.role || 'Collaborateur'}`
                          : item.title}
                    </span>
                    {(item.type === 'journal' || item.type === 'member') && (
                      <span className="text-[10px] text-t-tertiary font-medium break-words">Projet: {item.projectName}</span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button onClick={() => restore(item)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                  <button onClick={() => permanentDelete(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
