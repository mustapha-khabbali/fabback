import { useState, useMemo } from 'react';
import { mockUsers } from '../../../data/usersData';
import { useApp, TABS } from '../../../context/AppContext';

export default function ContributorsModal({ project, onClose, onSave, showNotification }) {
  const { currentUser, recycleBin, saveRecycleBin, setSelectedUser: setAppSelectedUser, setActiveTab, setNavigationHistory, notifications, setNotifications } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Addition role type states
  const [roleType, setRoleType] = useState('MEMBER'); // 'CO_FOUNDER' | 'MEMBER' | 'CUSTOM'
  const [customRoleName, setCustomRoleName] = useState('');
  const [grantAdminAccess, setGrantAdminAccess] = useState(false);
  const [isModifyMode, setIsModifyMode] = useState(false);

  // Editing contributor states
  const [editingContributorId, setEditingContributorId] = useState(null);
  const [editRoleType, setEditRoleType] = useState('MEMBER');
  const [editCustomRoleName, setEditCustomRoleName] = useState('');
  const [editGrantAdminAccess, setEditGrantAdminAccess] = useState(false);

  // Compute permissions matrix for current user
  const permissions = useMemo(() => {
    const isFounder = project.userId === currentUser.id;
    const contributor = (project.contributors || []).find(c => c.userId === currentUser.id);
    const isCoFounder = contributor?.accessLevel === 'CO_FOUNDER';
    const isAdminRole = contributor?.isAdmin === true;
    const isProjectAdmin = isFounder || isCoFounder || isAdminRole;

    return {
      isFounder,
      isCoFounder,
      isAdmin: isProjectAdmin,
      canModifyProject: isProjectAdmin,
      canModifyTeam: isProjectAdmin,
      canTransferControl: isFounder || isCoFounder
    };
  }, [project, currentUser.id]);

  // Find the founder user
  const founder = (project.userId === currentUser.id) ? currentUser : (mockUsers.find(u => u.id === project.userId) || { prenom: 'Inconnu', nom: '', role: 'Fondateur' });

  // Count active project admins
  const activeAdmins = useMemo(() => {
    const list = [project.userId];
    (project.contributors || []).forEach(c => {
      if (c.status === 'ACCEPTED' && (c.accessLevel === 'CO_FOUNDER' || c.isAdmin)) {
        if (!list.includes(c.userId)) list.push(c.userId);
      }
    });
    return list;
  }, [project]);

  const multipleAdminsExist = activeAdmins.length > 1;

  // Filter users for search (only stagiaires, and not the founder or already added contributors)
  const filteredSearchUsers = useMemo(() => {
    if (!searchQuery.trim()) return [];

    return mockUsers.filter(user => {
      const isStagiaire = user.role === 'stagiaire';
      const isNotFounder = user.id !== project.userId;
      const isNotAlreadyContributor = !(project.contributors || []).some(c => c.userId === user.id);

      const matchesSearch =
        `${user.prenom} ${user.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase());

      return isStagiaire && isNotFounder && isNotAlreadyContributor && matchesSearch;
    });
  }, [searchQuery, project.userId, project.contributors]);

  const handleAddContributor = () => {
    if (!selectedUser) return;

    let finalRole = '';
    let finalAccessLevel = 'MEMBER';
    let finalIsAdmin = false;

    if (roleType === 'CO_FOUNDER') {
      finalRole = 'Co-fondateur';
      finalAccessLevel = 'CO_FOUNDER';
      finalIsAdmin = true;
    } else if (roleType === 'MEMBER') {
      finalRole = 'Tuteur';
      finalAccessLevel = 'MEMBER';
      finalIsAdmin = false;
    } else {
      finalRole = customRoleName.trim() || 'Collaborateur';
      finalAccessLevel = 'MEMBER';
      finalIsAdmin = grantAdminAccess;
    }

    const newContributor = {
      userId: selectedUser.id,
      role: finalRole,
      accessLevel: finalAccessLevel,
      isAdmin: finalIsAdmin,
      status: 'PENDING',
      approvals: [currentUser.id],
      memberAccepted: selectedUser.id === currentUser.id,
      addedAt: new Date().toISOString()
    };

    const hasAllAdminApprovals = activeAdmins.length <= 1 || activeAdmins.every(id => newContributor.approvals && newContributor.approvals.map(String).includes(String(id)));
    if (hasAllAdminApprovals && newContributor.memberAccepted) {
      newContributor.status = 'ACCEPTED';
    }

    const updatedContributors = [...(project.contributors || []), newContributor];
    onSave(updatedContributors);

    // Reset state
    setSelectedUser(null);
    setRoleType('MEMBER');
    setCustomRoleName('');
    setGrantAdminAccess(false);
    setSearchQuery('');
    setIsAdding(false);

    if (newContributor.status === 'ACCEPTED') {
      showNotification(`${selectedUser.prenom} ajouté.`);
    } else {
      showNotification("Demande d'ajout envoyée (en attente d'approbations/acceptation)");

      if (!newContributor.memberAccepted) {
        const inviteNotif = {
          id: `invite-${project.id}-${selectedUser.id}-${Date.now()}`,
          type: 'project_invite',
          recipientId: selectedUser.id,
          senderId: currentUser.id,
          senderName: `${currentUser.prenom} ${currentUser.nom}`,
          projectId: project.id,
          projectTitle: project.title,
          role: finalRole,
          title: `Invitation à rejoindre ${project.title}`,
          message: `${currentUser.prenom} ${currentUser.nom} t'invite à rejoindre "${project.title}" en tant que ${finalRole}.`,
          status: 'unread',
          time: 'À l\'instant'
        };
        setNotifications([inviteNotif, ...notifications]);
      }
    }
  };

  const handleRemoveContributor = (userId) => {
    const contributor = project.contributors.find(c => c.userId === userId);
    if (!contributor) return;

    if (contributor.status === 'PENDING' && !contributor.pendingRemove) {
      // If it was a pending addition that hasn't been finalized, cancel/remove immediately
      const finalContributors = project.contributors.filter(c => c.userId !== userId);
      onSave(finalContributors);
      showNotification("Invitation annulée");
      return;
    }

    const updatedContributors = project.contributors.map(c => {
      if (c.userId === userId) {
        const nextApprovals = Array.isArray(c.approvals) ? c.approvals : [];
        const approvals = nextApprovals.includes(currentUser.id) ? nextApprovals : [...nextApprovals, currentUser.id];
        return {
          ...c,
          pendingRemove: true,
          approvals
        };
      }
      return c;
    });

    const target = updatedContributors.find(c => c.userId === userId);
    const hasAllAdminApprovals = activeAdmins.length <= 1 || activeAdmins.every(id => target.approvals && target.approvals.map(String).includes(String(id)));

    if (hasAllAdminApprovals) {
      const finalContributors = updatedContributors.filter(c => c.userId !== userId);

      // Move to recycle bin
      const binEntry = {
        id: Math.random().toString(36).substring(2, 15),
        type: 'member',
        projectId: project.id,
        projectName: project.title,
        memberData: { ...contributor, status: 'ACCEPTED' },
        deletedAt: new Date().toISOString()
      };
      saveRecycleBin([binEntry, ...(Array.isArray(recycleBin) ? recycleBin : [])]);

      onSave(finalContributors);
      showNotification("Contributeur retiré");
    } else {
      onSave(updatedContributors);
      showNotification("Demande de retrait soumise pour approbation");
    }
  };

  const handleEditRole = (contributor) => {
    setEditingContributorId(contributor.userId);
    const role = contributor.pendingRole || contributor.role;
    const accessLevel = contributor.pendingAccessLevel || contributor.accessLevel;
    const isAdmin = contributor.pendingIsAdmin !== undefined ? contributor.pendingIsAdmin : contributor.isAdmin;

    if (accessLevel === 'CO_FOUNDER') {
      setEditRoleType('CO_FOUNDER');
      setEditCustomRoleName('Co-fondateur');
      setEditGrantAdminAccess(true);
    } else if (role === 'Tuteur' && !isAdmin) {
      setEditRoleType('MEMBER');
      setEditCustomRoleName('Tuteur');
      setEditGrantAdminAccess(false);
    } else {
      setEditRoleType('CUSTOM');
      setEditCustomRoleName(role || '');
      setEditGrantAdminAccess(isAdmin === true);
    }
  };

  const saveEditedRole = () => {
    let finalRole = '';
    let finalAccessLevel = 'MEMBER';
    let finalIsAdmin = false;

    if (editRoleType === 'CO_FOUNDER') {
      finalRole = 'Co-fondateur';
      finalAccessLevel = 'CO_FOUNDER';
      finalIsAdmin = true;
    } else if (editRoleType === 'MEMBER') {
      finalRole = 'Tuteur';
      finalAccessLevel = 'MEMBER';
      finalIsAdmin = false;
    } else {
      finalRole = editCustomRoleName.trim() || 'Collaborateur';
      finalAccessLevel = 'MEMBER';
      finalIsAdmin = editGrantAdminAccess;
    }

    const updatedContributors = project.contributors.map(c => {
      if (c.userId === editingContributorId) {
        return {
          ...c,
          status: 'PENDING',
          pendingRole: finalRole,
          pendingAccessLevel: finalAccessLevel,
          pendingIsAdmin: finalIsAdmin,
          approvals: [currentUser.id],
          memberAccepted: false
        };
      }
      return c;
    });

    const target = updatedContributors.find(c => c.userId === editingContributorId);
    const hasAllAdminApprovals = activeAdmins.length <= 1 || activeAdmins.every(id => target.approvals && target.approvals.map(String).includes(String(id)));
    const hasMemberAcceptance = target.memberAccepted;

    if (hasAllAdminApprovals && hasMemberAcceptance) {
      const finalized = updatedContributors.map(c =>
        c.userId === editingContributorId
          ? {
            ...c,
            role: finalRole,
            accessLevel: finalAccessLevel,
            isAdmin: finalIsAdmin,
            status: 'ACCEPTED',
            pendingRole: null,
            pendingAccessLevel: null,
            pendingIsAdmin: null,
            approvals: null,
            memberAccepted: null
          }
          : c
      );
      onSave(finalized);
      showNotification("Rôle mis à jour");
    } else {
      onSave(updatedContributors);
      showNotification("Changement de rôle soumis (en attente d'approbations/acceptation)");
    }
    setEditingContributorId(null);
  };

  const getContributorInfo = (userId) => {
    if (userId === currentUser.id) return currentUser;
    return mockUsers.find(u => u.id === userId) || { prenom: 'Utilisateur', nom: 'Inconnu', avatar: null };
  };

  const handleApproveContributor = (c) => {
    const updatedContributors = project.contributors.map(item => {
      if (item.userId === c.userId) {
        const nextApprovals = Array.isArray(item.approvals) ? item.approvals : [];
        const approvals = nextApprovals.includes(currentUser.id) ? nextApprovals : [...nextApprovals, currentUser.id];
        return {
          ...item,
          approvals
        };
      }
      return item;
    });

    const target = updatedContributors.find(item => item.userId === c.userId);
    const hasAllAdminApprovals = activeAdmins.length <= 1 || activeAdmins.every(id => target.approvals && target.approvals.map(String).includes(String(id)));

    if (target.pendingRemove) {
      if (hasAllAdminApprovals) {
        const finalContributors = updatedContributors.filter(item => item.userId !== c.userId);
        const binEntry = {
          id: Math.random().toString(36).substring(2, 15),
          type: 'member',
          projectId: project.id,
          projectName: project.title,
          memberData: { ...c, status: 'ACCEPTED' },
          deletedAt: new Date().toISOString()
        };
        saveRecycleBin([binEntry, ...(Array.isArray(recycleBin) ? recycleBin : [])]);
        onSave(finalContributors);
        showNotification("Contributeur retiré");
      } else {
        onSave(updatedContributors);
        showNotification("Retrait approuvé, en attente des autres administrateurs");
      }
    } else {
      const hasMemberAcceptance = target.memberAccepted === true;
      if (hasAllAdminApprovals && hasMemberAcceptance) {
        const finalized = updatedContributors.map(item =>
          item.userId === c.userId
            ? {
              ...item,
              role: item.pendingRole || item.role,
              accessLevel: item.pendingAccessLevel || item.accessLevel,
              isAdmin: item.pendingIsAdmin !== undefined ? item.pendingIsAdmin : item.isAdmin,
              status: 'ACCEPTED',
              pendingRole: null,
              pendingAccessLevel: null,
              pendingIsAdmin: null,
              approvals: null,
              memberAccepted: null
            }
            : item
        );
        onSave(finalized);
        showNotification("Action finalisée et approuvée !");
      } else {
        onSave(updatedContributors);
        showNotification("Approuvé, en attente des autres validations");
      }
    }
  };

  const handleRejectContributor = (c) => {
    let updated;
    if (!c.pendingRole && !c.pendingRemove) {
      // Pending addition rejected -> completely remove them
      updated = project.contributors.filter(item => item.userId !== c.userId);
    } else {
      // Pending modification or removal rejected -> restore original accepted state
      updated = project.contributors.map(item =>
        item.userId === c.userId
          ? {
            ...item,
            status: 'ACCEPTED',
            pendingRole: null,
            pendingAccessLevel: null,
            pendingIsAdmin: null,
            pendingRemove: null,
            approvals: null,
            memberAccepted: null
          }
          : item
      );
    }
    onSave(updated);
    showNotification("Action rejetée");
  };

  const handleViewProfile = (userId) => {
    const u = userId === currentUser.id ? currentUser : mockUsers.find(mu => mu.id === userId);
    if (!u) return;
    onClose();
    const entry = { selectedUser: null, currentProjectId: project.id, fromTab: TABS.MY_PROJECT };
    console.log('[ContributorsModal handleViewProfile] SETTING navHistory:', JSON.stringify(entry));
    setNavigationHistory([entry]);
    if (u.id === currentUser.id) {
      console.log('[ContributorsModal handleViewProfile] Viewing self, setting selectedUser to null');
      setActiveTab('profile');
      setAppSelectedUser(null);
    } else {
      console.log('[ContributorsModal handleViewProfile] Viewing other member:', u.id);
      setAppSelectedUser(u);
      setActiveTab('profile');
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-midnight-blue/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="fixed inset-0" onClick={onClose}></div>
      <div className="bg-t-surface w-full max-w-lg rounded-t-[40px] shadow-2xl overflow-hidden flex flex-col h-[75vh] relative z-10 animate-in slide-in-from-bottom duration-500">
        {/* Handle Bar */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 shrink-0"></div>

        <div className="p-8 pb-4 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-t-primary uppercase tracking-tighter">
              Contributeurs
            </h3>
            <p className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest">Gérer l'équipe du projet</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-t-surface-alt rounded-full text-t-muted hover:text-t-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8 custom-scrollbar pb-12">
          {/* Founder Section */}
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Fondateur</label>
            <div className="flex items-center space-x-4 p-4 bg-blue-50/50 rounded-3xl border border-blue-100/50">
              <div className="w-12 h-12 bg-t-surface rounded-2xl flex items-center justify-center text-lg font-black text-[#3B5FE6] shadow-sm border border-blue-100">
                {founder.avatar ? (
                  <img src={founder.avatar} alt="" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <span>{(founder.prenom?.[0] || '') + (founder.nom?.[0] || '')}</span>
                )}
              </div>
              <div>
                <h4 className="font-bold text-t-primary">{founder.prenom} {founder.nom}</h4>
                <p className="text-[10px] font-black text-[#3B5FE6] uppercase tracking-widest">Fondateur</p>
              </div>
            </div>
          </div>

          {/* Contributors List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest">L'équipe</label>
              <div className="flex items-center space-x-3">
                {permissions.canModifyTeam && (
                  <>
                    <button
                      onClick={() => setIsAdding(true)}
                      className="text-[10px] font-black text-[#3B5FE6] uppercase tracking-widest flex items-center space-x-1"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                      <span>Ajouter</span>
                    </button>
                    <button
                      onClick={() => setIsModifyMode(!isModifyMode)}
                      className={`text-[10px] font-black uppercase tracking-widest flex items-center space-x-1 transition-colors ${isModifyMode ? 'text-[#3B5FE6]' : 'text-t-tertiary hover:text-[#3B5FE6]'}`}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      <span>Modifier</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {(!project.contributors || project.contributors.length === 0) ? (
                <div className="py-8 text-center bg-t-surface-alt rounded-3xl border border-dashed border-t-border-strong">
                  <p className="text-xs font-bold text-t-muted uppercase tracking-widest">Aucun contributeur</p>
                </div>
              ) : (
                project.contributors.map(c => {
                  const info = getContributorInfo(c.userId);
                  const isEditing = editingContributorId === c.userId;
                  const isPending = c.status !== 'ACCEPTED';

                  return (
                    <div key={c.userId} className={`flex items-center space-x-4 p-4 bg-t-surface rounded-3xl border border-t-border group transition-all duration-300 ${isPending ? 'opacity-60 bg-t-surface-alt/50' : ''}`}>
                      <div
                        onClick={() => handleViewProfile(c.userId)}
                        className="w-10 h-10 bg-t-surface-alt rounded-xl flex items-center justify-center text-sm font-black text-t-muted border border-t-border shrink-0 cursor-pointer hover:scale-105 transition-all"
                      >
                        {info.avatar ? (
                          <img src={info.avatar} alt="" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <span>{(info.prenom?.[0] || '') + (info.nom?.[0] || '')}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          onClick={() => handleViewProfile(c.userId)}
                          className="text-sm font-bold text-t-primary truncate cursor-pointer hover:text-[#3B5FE6] hover:underline transition-all"
                        >
                          {info.prenom} {info.nom}
                        </h4>
                        {isEditing ? (
                          <div className="flex flex-col space-y-3 mt-2 p-3 bg-t-surface-alt rounded-2xl border border-t-border animate-in fade-in duration-300">
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { type: 'MEMBER', label: 'Tuteur' },
                                { type: 'CO_FOUNDER', label: 'Co-fondateur' },
                                { type: 'CUSTOM', label: 'Rôle personnalisé' }
                              ].map(item => (
                                <button
                                  key={item.type}
                                  type="button"
                                  onClick={() => {
                                    setEditRoleType(item.type);
                                    if (item.type === 'CO_FOUNDER') {
                                      setEditCustomRoleName('Co-fondateur');
                                      setEditGrantAdminAccess(true);
                                    } else if (item.type === 'MEMBER') {
                                      setEditCustomRoleName('Membre');
                                      setEditGrantAdminAccess(false);
                                    }
                                  }}
                                  className={`px-2.5 py-1.5 rounded-xl text-[9px] font-bold border transition-all ${editRoleType === item.type
                                      ? 'bg-blue-50/50 text-[#3B5FE6] border-[#3B5FE6]'
                                      : 'bg-t-surface text-t-secondary border-t-border-strong'
                                    }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>

                            {editRoleType === 'CUSTOM' && (
                              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <input
                                  autoFocus
                                  className="w-full text-xs font-bold text-t-primary outline-none bg-t-surface rounded-xl px-3 py-2 border border-t-border-strong"
                                  value={editCustomRoleName}
                                  onChange={(e) => setEditCustomRoleName(e.target.value)}
                                  placeholder="Nom du rôle"
                                />
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`edit-admin-${c.userId}`}
                                    checked={editGrantAdminAccess}
                                    onChange={(e) => setEditGrantAdminAccess(e.target.checked)}
                                    className="w-4 h-4 rounded border-t-border-strong text-blue-600 focus:ring-blue-500"
                                  />
                                  <label htmlFor={`edit-admin-${c.userId}`} className="text-[10px] font-bold text-t-secondary uppercase">
                                    Administrateur Projet
                                  </label>
                                </div>
                              </div>
                            )}

                            <div className="flex justify-end space-x-2 pt-1 border-t border-t-border-strong/50">
                              <button
                                onClick={() => setEditingContributorId(null)}
                                className="px-3 py-1.5 bg-t-surface text-t-tertiary border border-t-border-strong text-[10px] font-bold rounded-lg uppercase"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={saveEditedRole}
                                className="px-3 py-1.5 bg-[#3B5FE6] text-white text-[10px] font-black rounded-lg uppercase shadow-md shadow-blue-500/10"
                              >
                                Enregistrer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] font-black text-t-muted uppercase tracking-widest flex items-center flex-wrap gap-1">
                            <span>{c.role}</span>
                            {isPending && (
                              <span className="text-[#3B5FE6] font-bold text-[8px] uppercase tracking-wider bg-blue-50/70 border border-blue-100/50 px-1.5 py-0.5 rounded-md ml-1">
                                {(() => {
                                  const needsAdmin = !activeAdmins.every(id => c.approvals && c.approvals.map(String).includes(String(id)));
                                  const needsMember = !c.memberAccepted;
                                  if (needsAdmin && needsMember) return "en attente (admin & membre)";
                                  if (needsAdmin) return "en attente (admin)";
                                  if (needsMember) return "en attente (membre)";
                                  return "en attente";
                                })()}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center space-x-2">
                        {isPending && (
                          <div className="flex items-center space-x-1.5">
                            {permissions.isAdmin && (!c.approvals || !c.approvals.map(String).includes(String(currentUser.id))) ? (
                              <>
                                <button
                                  onClick={() => handleApproveContributor(c)}
                                  className="px-2 py-1 bg-green-50 text-green-500 hover:bg-green-100 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                                >
                                  Approuver
                                </button>
                                <button
                                  onClick={() => handleRejectContributor(c)}
                                  className="px-2 py-1 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                                >
                                  Rejeter
                                </button>
                              </>
                            ) : (
                              <span className="text-[8px] font-bold text-[#3B5FE6] uppercase tracking-widest bg-blue-50/50 px-2 py-0.5 rounded-md">
                                {c.approvals && c.approvals.map(String).includes(String(currentUser.id)) ? "Approuvé" : "En attente"}
                              </span>
                            )}
                          </div>
                        )}
                        {!isEditing && permissions.canModifyTeam && (
                          <div className={`flex items-center space-x-1 transition-all ${isModifyMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <button
                              onClick={() => handleEditRole(c)}
                              className="p-2 text-t-muted hover:text-[#3B5FE6] hover:bg-blue-50 rounded-xl transition-all"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            {c.userId !== project.userId && (
                              <button
                                onClick={() => handleRemoveContributor(c.userId)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Add Contributor Flow (Overlay inside modal) */}
        {isAdding && (
          <div className="absolute inset-0 bg-t-surface z-20 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-8 pb-4 flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-t-primary uppercase tracking-tighter">
                  Nouveau membre
                </h3>
                <p className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest">Rechercher un stagiaire</p>
              </div>
              <button
                onClick={() => { setIsAdding(false); setSelectedUser(null); setSearchQuery(''); }}
                className="p-2 bg-t-surface-alt rounded-full text-t-muted hover:text-t-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 custom-scrollbar">
              {!selectedUser ? (
                <>
                  <div className="relative">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Rechercher par nom..."
                      className="w-full py-4 pl-12 pr-6 bg-t-surface-alt rounded-[24px] border border-t-border focus:border-[#3B5FE6] focus:bg-t-surface outline-none text-sm font-bold transition-all shadow-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <svg className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-t-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  <div className="space-y-2">
                    {filteredSearchUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className="w-full flex items-center space-x-4 p-3 hover:bg-blue-50 rounded-2xl transition-colors text-left group"
                      >
                        <div className="w-10 h-10 bg-t-surface rounded-xl flex items-center justify-center text-sm font-black text-[#3B5FE6] border border-blue-100 group-hover:border-[#3B5FE6]/30">
                          {user.avatar ? (
                            <img src={user.avatar} alt="" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <span>{(user.prenom?.[0] || '') + (user.nom?.[0] || '')}</span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-t-primary">{user.prenom} {user.nom}</h4>
                          <p className="text-[10px] text-t-muted font-bold uppercase tracking-widest">{user.filiere || 'Stagiaire'}</p>
                        </div>
                      </button>
                    ))}
                    {searchQuery && filteredSearchUsers.length === 0 && (
                      <div className="py-12 text-center">
                        <p className="text-xs font-bold text-t-muted uppercase tracking-widest">Aucun résultat</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-24 h-24 bg-blue-50 rounded-[32px] flex items-center justify-center text-3xl font-black text-[#3B5FE6] border-4 border-white shadow-xl">
                      {selectedUser.avatar ? (
                        <img src={selectedUser.avatar} alt="" className="w-full h-full object-cover rounded-[28px]" />
                      ) : (
                        <span>{(selectedUser.prenom?.[0] || '') + (selectedUser.nom?.[0] || '')}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-t-primary">{selectedUser.prenom} {selectedUser.nom}</h4>
                      {/* Email hidden for privacy */}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Type de rôle</label>
                    <div className="flex flex-col space-y-2">
                      {[
                        { type: 'MEMBER', label: 'Tuteur' },
                        { type: 'CO_FOUNDER', label: 'Co-fondateur' },
                        { type: 'CUSTOM', label: 'Rôle personnalisé' }
                      ].map(item => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setRoleType(item.type)}
                          className={`w-full p-4 rounded-2xl text-xs font-bold text-left border transition-all ${roleType === item.type
                              ? 'bg-blue-50/50 text-[#3B5FE6] border-[#3B5FE6] shadow-sm'
                              : 'bg-t-surface text-t-secondary border-t-border'
                            }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {roleType === 'CUSTOM' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Nom du rôle</label>
                        <input
                          autoFocus
                          type="text"
                          placeholder="ex: Designer, Lead Developer..."
                          className="w-full py-4 px-5 bg-t-surface-alt rounded-2xl border border-t-border focus:border-[#3B5FE6] focus:bg-t-surface outline-none text-sm font-bold transition-all text-t-primary"
                          value={customRoleName}
                          onChange={(e) => setCustomRoleName(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center space-x-2 px-1">
                        <input
                          type="checkbox"
                          id="grant-admin"
                          checked={grantAdminAccess}
                          onChange={(e) => setGrantAdminAccess(e.target.checked)}
                          className="w-5 h-5 rounded border-t-border-strong text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="grant-admin" className="text-xs font-bold text-t-secondary uppercase">
                          Accorder les accès administrateur projet
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 space-y-3">
                    <button
                      onClick={handleAddContributor}
                      disabled={roleType === 'CUSTOM' && !customRoleName.trim()}
                      className="w-full py-5 bg-[#3B5FE6] text-white font-black rounded-3xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all uppercase tracking-widest text-sm disabled:opacity-20"
                    >
                      Ajouter à l'équipe
                    </button>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="w-full py-4 text-t-muted font-bold uppercase tracking-widest text-[10px]"
                    >
                      Retour à la recherche
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
