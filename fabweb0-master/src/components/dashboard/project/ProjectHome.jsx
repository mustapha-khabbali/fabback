import { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { findUserByIdentity, getPrimaryUserId, isCurrentUserId } from '../../../utils/userIdentity';

const SHOW_ARTICLES_BUTTON = false;

function uniqueProjectsById(projects) {
  const seen = new Set();
  return projects.filter((project) => {
    if (!project?.id || seen.has(project.id)) return false;
    seen.add(project.id);
    return true;
  });
}

export default function ProjectHome({ onCreateProject, onShowDetail, onShowRecycle, onShowArticles }) {
  const { currentUser, userProjects, allProjects, saveProjects, setCurrentProjectId, recycleBin, saveRecycleBin, showNotification, usersList } = useApp();
  const currentUserId = getPrimaryUserId(currentUser);
  const canRemoveProjects = currentUser?.role !== 'stagiaire';
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);
  
  // Deletion prompt states
  const [pendingDeleteProjects, setPendingDeleteProjects] = useState([]);
  const [currentDecisionIndex, setCurrentDecisionIndex] = useState(-1);

  const handleProjectClick = (id) => {
    if (canRemoveProjects && isDeleteMode) {
      if (selectedProjects.includes(id)) {
        setSelectedProjects(selectedProjects.filter(p => p !== id));
      } else {
        setSelectedProjects([...selectedProjects, id]);
      }
      return;
    }
    setCurrentProjectId(id);
    onShowDetail();
  };

  const confirmDelete = () => {
    if (!canRemoveProjects) return;

    if (selectedProjects.length === 0) {
      setIsDeleteMode(false);
      return;
    }

    // Classify selected projects
    const allSelected = [
      ...userProjects,
      ...(allProjects || [])
    ].filter(p => selectedProjects.includes(p.id));

    const needsDecisionList = [];
    const directDeleteList = [];

    allSelected.forEach(p => {
      const isFounder = isCurrentUserId(currentUser, p.userId);
      const contrib = (p.contributors || []).find(c => isCurrentUserId(currentUser, c.userId));
      const isCoFounder = contrib?.accessLevel === 'CO_FOUNDER';
      const hasOtherAcceptedMembers = (p.contributors || []).some(c => !isCurrentUserId(currentUser, c.userId) && c.status === 'ACCEPTED');

      if ((isFounder || isCoFounder) && hasOtherAcceptedMembers) {
        needsDecisionList.push(p);
      } else {
        directDeleteList.push(p);
      }
    });

    // Handle direct deletes first
    if (directDeleteList.length > 0) {
      const updatedProjects = userProjects.map(p => {
        if (directDeleteList.some(d => d.id === p.id)) {
          // If we are a member, just remove ourselves from contributors
          const contrib = (p.contributors || []).find(c => isCurrentUserId(currentUser, c.userId));
          if (contrib && !isCurrentUserId(currentUser, p.userId)) {
            return {
              ...p,
              contributors: p.contributors.filter(c => !isCurrentUserId(currentUser, c.userId))
            };
          }
        }
        return p;
      });

      // Filter out projects that are owned by us and deleted
      const finalProjects = updatedProjects.filter(p => {
        const isOwned = isCurrentUserId(currentUser, p.userId);
        const isDeleted = directDeleteList.some(d => d.id === p.id);
        return !(isOwned && isDeleted);
      });

      // Move owned projects to recycle bin
      const ownedDeletes = directDeleteList.filter(d => isCurrentUserId(currentUser, d.userId));
      const recycleEntries = ownedDeletes.map(p => ({
        ...p,
        type: 'project',
        deletedAt: new Date().toISOString()
      }));

      saveProjects(finalProjects);
      if (recycleEntries.length > 0) {
        saveRecycleBin([...recycleEntries, ...(Array.isArray(recycleBin) ? recycleBin : [])]);
      }
    }

    if (needsDecisionList.length > 0) {
      setPendingDeleteProjects(needsDecisionList);
      setCurrentDecisionIndex(0);
    } else {
      setSelectedProjects([]);
      setIsDeleteMode(false);
      showNotification("Suppression effectuée");
    }
  };

  return (
    <div className="flex flex-col h-full lg:relative lg:bg-t-surface-alt/50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 main-container pt-8 pb-4 px-6 shrink-0 border-b border-t-border/50 lg:bg-transparent lg:border-none lg:pt-12 lg:px-12 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-t-primary lg:text-4xl">Mon Projet</h2>
        {canRemoveProjects && isDeleteMode && (
          <button 
            onClick={confirmDelete}
            className="px-6 py-2 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg shadow-red-500/20 animate-pulse active:scale-95 transition-all"
          >
            Confirmer ({selectedProjects.length})
          </button>
        )}
      </div>

      {/* Scrollable Grid Section */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 lg:px-12 lg:py-8">
        <div className="space-y-6 lg:max-w-7xl lg:mx-auto">
          <h3 className="text-[10px] font-bold text-t-muted uppercase tracking-[0.2em] px-1 lg:text-sm lg:tracking-widest">
            {canRemoveProjects && isDeleteMode ? 'Sélectionner les projets à supprimer' : 'Mes Dossiers'}
          </h3>
          <div className="grid grid-cols-3 gap-x-4 gap-y-6 lg:grid-cols-6 lg:gap-8 lg:gap-y-12">
            {(() => {
              // Merge owned projects with projects where user is a contributor
              const combinedProjects = uniqueProjectsById([
                ...userProjects,
                ...(allProjects || []).filter(p => 
                  !isCurrentUserId(currentUser, p.userId) && // Don't duplicate if already in userProjects
                  (p.contributors || []).some(c => isCurrentUserId(currentUser, c.userId))
                )
              ]).filter(p => !p.removedByUsers?.map(String).includes(String(currentUserId)));

              if (combinedProjects.length === 0) {
                return <div className="col-span-3 text-center py-10 text-t-muted italic text-sm lg:col-span-6 lg:py-20 lg:text-lg">Aucun projet</div>;
              }

              return combinedProjects.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => handleProjectClick(p.id)} 
                  className={`flex flex-col items-center space-y-2 group transition-all active:scale-95 lg:bg-t-surface-alt lg:p-6 lg:rounded-[32px] lg:shadow-sm lg:border lg:duration-300 ${
                    selectedProjects.includes(p.id) ? 'scale-90 opacity-60' : 'lg:hover:shadow-xl lg:hover:-translate-y-2'
                  }`}
                >
                  <div className={`w-full aspect-square flex items-center justify-center transition-transform duration-300 relative lg:w-32 lg:h-32 ${
                    selectedProjects.includes(p.id) ? 'ring-4 ring-red-500 rounded-3xl' : 'group-hover:scale-105'
                  }`}>
                    <svg className="w-full h-full text-[#FFCD29] drop-shadow-md lg:drop-shadow-xl" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V8C22 6.89 21.11 6 20 6H12L10 4Z" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center pt-2 lg:pt-4">
                      {selectedProjects.includes(p.id) ? (
                        <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-6 w-6 text-white/40 lg:h-10 lg:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold text-center w-full px-1 capitalize break-words lg:text-sm lg:mt-6 ${
                    selectedProjects.includes(p.id) ? 'text-red-500' : 'text-t-primary/80 lg:text-t-primary'
                  }`}>{p.title}</span>
                  <div className="flex -space-x-1 mt-1 lg:mt-3">
                    {[p.userId, ...(p.contributors || []).map(c => c.userId)].slice(0, 3).map((uid, i) => {
                      const u = findUserByIdentity(usersList, uid, currentUser);
                      const colors = ['#FF6B6B', '#4ECDC4', '#3B5FE6', '#FF9F43', '#10AC84'];
                      return (
                        <div 
                          key={uid} 
                          className="w-4 h-4 rounded-full border border-white flex items-center justify-center text-[5px] font-black text-white shadow-sm overflow-hidden uppercase lg:w-6 lg:h-6 lg:text-[8px]" 
                          style={{ zIndex: 10 - i, backgroundColor: colors[i % colors.length] }}
                        >
                          {u?.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <span>{u?.prenom?.[0] || '?'}</span>}
                        </div>
                      );
                    })}
                  </div>
                </button>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="sticky bottom-0 z-20 bg-t-surface/90 backdrop-blur-xl p-6 pb-2 shrink-0 border-t border-t-border flex items-center justify-between gap-2 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] lg:absolute lg:top-12 lg:right-12 lg:bottom-auto lg:w-auto lg:border-none lg:shadow-none lg:bg-transparent lg:p-0 lg:gap-4 lg:flex-row">
        <button onClick={onCreateProject} className="flex-1 flex flex-col items-center justify-center p-3 bg-t-surface border border-t-border rounded-[28px] shadow-sm space-y-1 hover:bg-t-surface-alt transition-all active:scale-95 lg:flex-row lg:flex-initial lg:px-6 lg:py-3 lg:rounded-full lg:h-12 lg:space-y-0 lg:space-x-2 lg:bg-[#3B5FE6] lg:hover:bg-blue-700 lg:border-none lg:shadow-lg lg:hover:shadow-[#3B5FE6]/30">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl lg:p-0 lg:bg-transparent lg:text-white">
            <svg className="h-5 w-5 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
          </div>
          <span className="text-[9px] font-bold text-t-primary uppercase tracking-tight lg:text-xs lg:text-white lg:tracking-wide">Créer</span>
        </button>

        {canRemoveProjects && (
          <button 
            onClick={() => { setIsDeleteMode(!isDeleteMode); setSelectedProjects([]); }} 
            className={`flex-1 flex flex-col items-center justify-center p-3 border rounded-[28px] shadow-sm space-y-1 transition-all active:scale-95 lg:flex-row lg:flex-initial lg:px-6 lg:py-3 lg:rounded-full lg:h-12 lg:space-y-0 lg:space-x-2 ${
              isDeleteMode ? 'bg-red-50 border-red-200 lg:bg-red-500 lg:border-none' : 'bg-t-surface border-t-border lg:bg-t-surface-alt lg:border-t-border-strong'
            }`}
          >
            <div className={`p-1.5 rounded-xl lg:p-0 lg:bg-transparent ${isDeleteMode ? 'bg-red-100 text-red-600 lg:text-white' : 'bg-red-50 text-red-500'}`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-tight lg:text-xs lg:tracking-wide ${isDeleteMode ? 'text-red-700 lg:text-white' : 'text-t-primary'}`}>
              {isDeleteMode ? 'Annuler' : 'Supprimer'}
            </span>
          </button>
        )}

        {SHOW_ARTICLES_BUTTON && (
          <button onClick={onShowArticles} className="flex-1 flex flex-col items-center justify-center p-3 bg-t-surface border border-t-border rounded-[28px] shadow-sm space-y-1 hover:bg-t-surface-alt transition-all active:scale-95 lg:flex-row lg:flex-initial lg:px-6 lg:py-3 lg:rounded-full lg:h-12 lg:space-y-0 lg:space-x-2 lg:bg-t-surface-alt lg:hover:bg-t-surface-alt lg:border-t-border-strong lg:shadow-md">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl lg:p-0 lg:bg-transparent lg:text-emerald-600">
              <svg className="h-5 w-5 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <span className="text-[9px] font-bold text-t-primary uppercase tracking-tight text-center lg:text-xs lg:tracking-wide">Articles</span>
          </button>
        )}

        {canRemoveProjects && (
          <button onClick={onShowRecycle} className="flex-1 flex flex-col items-center justify-center p-3 bg-t-surface border border-t-border rounded-[28px] shadow-sm space-y-1 hover:bg-t-surface-alt transition-all active:scale-95 lg:flex-row lg:flex-initial lg:px-6 lg:py-3 lg:rounded-full lg:h-12 lg:space-y-0 lg:space-x-2 lg:bg-t-surface-alt lg:hover:bg-t-surface-alt lg:border-t-border-strong lg:shadow-md lg:group">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl lg:p-0 lg:bg-transparent lg:text-indigo-500">
              <svg className="h-5 w-5 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <span className="text-[9px] font-bold text-t-primary uppercase tracking-tight lg:text-xs lg:tracking-wide">Bin</span>
          </button>
        )}
      </div>

      {/* Delete Decision Modal */}
      {currentDecisionIndex >= 0 && pendingDeleteProjects[currentDecisionIndex] && (() => {
        const proj = pendingDeleteProjects[currentDecisionIndex];
        const isFounder = isCurrentUserId(currentUser, proj.userId);
        
        // Find other accepted members we can transfer control to
        const otherMembers = (proj.contributors || [])
          .filter(c => !isCurrentUserId(currentUser, c.userId) && c.status === 'ACCEPTED')
          .map(c => {
            const u = findUserByIdentity(usersList, c.userId, currentUser);
            return { ...c, info: u };
          });

        return (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-midnight-blue/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-t-surface w-full max-w-sm rounded-[32px] shadow-2xl p-6 relative overflow-hidden flex flex-col space-y-6 animate-in zoom-in-95 duration-300">
              <div className="text-center space-y-2">
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Aide de transfert</span>
                <h3 className="text-lg font-black text-t-primary uppercase tracking-tight">
                  {proj.title}
                </h3>
                <p className="text-xs text-t-secondary font-semibold leading-relaxed">
                  Vous quittez ce projet contenant d'autres membres. Souhaitez-vous leur transférer le rôle de chef de projet (Fondateur) ou simplement retirer le projet de votre côté ?
                </p>
              </div>

              <div className="flex flex-col space-y-2">
                {/* Option 1: Remove from my side only */}
                <button
                  onClick={() => {
                    // Update project: add currentUser to removedByUsers
                    const updated = userProjects.map(p => {
                      if (p.id === proj.id) {
                        return {
                          ...p,
                          removedByUsers: [...(p.removedByUsers || []), currentUserId],
                          // If co-founder, also remove from contributors list
                          contributors: (p.contributors || []).filter(c => !isCurrentUserId(currentUser, c.userId))
                        };
                      }
                      return p;
                    });
                    saveProjects(updated);
                    showNotification("Projet retiré de votre côté");
                    
                    // Move to next decision or close
                    const nextIdx = currentDecisionIndex + 1;
                    if (nextIdx < pendingDeleteProjects.length) {
                      setCurrentDecisionIndex(nextIdx);
                    } else {
                      setCurrentDecisionIndex(-1);
                      setPendingDeleteProjects([]);
                      setSelectedProjects([]);
                      setIsDeleteMode(false);
                    }
                  }}
                  className="w-full py-4 bg-t-surface-alt hover:bg-t-surface-input text-t-primary font-bold rounded-2xl active:scale-[0.98] transition-all text-xs uppercase tracking-wider"
                >
                  Retirer de mon côté uniquement
                </button>

                {/* Option 2: Transfer ownership */}
                {isFounder && otherMembers.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <label className="text-[9px] font-black text-t-tertiary uppercase tracking-widest px-1">Choisir le repreneur</label>
                    <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                      {otherMembers.map(m => (
                        <button
                          key={m.userId}
                          onClick={() => {
                            // Transfer ownership:
                            // 1. set project.userId to m.userId
                            // 2. remove m.userId from project.contributors
                            // 3. remove the current user from project.contributors if present
                            // 4. remove project from currentUser's projects list (or set removedByUsers)
                            const updated = userProjects.map(p => {
                              if (p.id === proj.id) {
                                return {
                                  ...p,
                                  userId: m.userId,
                                  contributors: (p.contributors || []).filter(c => c.userId !== m.userId && !isCurrentUserId(currentUser, c.userId))
                                };
                              }
                              return p;
                            });
                            saveProjects(updated);
                            showNotification(`Propriété transférée à ${m.info?.prenom || 'Collaborateur'}`);

                            // Move to next decision
                            const nextIdx = currentDecisionIndex + 1;
                            if (nextIdx < pendingDeleteProjects.length) {
                              setCurrentDecisionIndex(nextIdx);
                            } else {
                              setCurrentDecisionIndex(-1);
                              setPendingDeleteProjects([]);
                              setSelectedProjects([]);
                              setIsDeleteMode(false);
                            }
                          }}
                          className="w-full flex items-center space-x-3 p-2 bg-blue-50/50 hover:bg-blue-50 border border-blue-100/30 rounded-xl text-left transition-colors"
                        >
                          <div className="w-7 h-7 bg-t-surface rounded-lg flex items-center justify-center text-[10px] font-black text-[#3B5FE6] border border-blue-100 shrink-0">
                            {m.info?.avatar ? <img src={m.info.avatar} alt="" className="w-full h-full object-cover rounded-lg" /> : <span>{m.info?.prenom?.[0]}</span>}
                          </div>
                          <span className="text-[11px] font-bold text-t-primary truncate">{m.info?.prenom} {m.info?.nom}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
