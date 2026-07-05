import { useState } from 'react';
import { useApp, TABS } from '../../../context/AppContext';
import ModifyProjectModal from './ModifyProjectModal';
import JournalCreateModal from './JournalCreateModal';
import JournalReaderModal from './JournalReaderModal';
import ContributorsModal from './ContributorsModal';
import SupervisorModal from './SupervisorModal';
import { findUserByIdentity, getPrimaryUserId, isCurrentUserId } from '../../../utils/userIdentity';

const JOURNAL_COLORS = ['#FF6B6B', '#4ECDC4', '#3B5FE6', '#FF9F43', '#10AC84', '#EE5253', '#5F27CD', '#222F3E'];
const SYSTEM_SUPERVISOR_IDS = ['user-sara', 'system-sara'];

function supervisorRoleLabel(role) {
  const normalized = (role || '').toLowerCase();
  if (normalized === 'formateur') return 'Formateur';
  if (normalized === 'administrateur') return 'Administrateur';
  return role || 'Encadrant';
}

function supervisorSubtitle(user) {
  return `${supervisorRoleLabel(user?.role)}${user?.bio ? ` · ${user.bio}` : ''}`;
}

const ALL_SDGS = Array.from({ length: 17 }, (_, i) => ({
  id: `sdg-${i + 1}`,
  number: i + 1,
  image: `/sdg/${i + 1}_result.webp`
}));

export default function ProjectDetail({ onBack }) {
  const { currentUser, userProjects, saveProjects, currentProjectId, recycleBin, saveRecycleBin, showNotification, setActiveTab, setSelectedUser, setNavigationHistory, usersList, notifications, setNotifications, recordPresenceActivity } = useApp();
  const currentUserId = getPrimaryUserId(currentUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModify, setShowModify] = useState(false);
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showJournalReader, setShowJournalReader] = useState(false);
  const [activeJournal, setActiveJournal] = useState(null);

  // SDG modal states
  const [showSdgModal, setShowSdgModal] = useState(false);
  const [isEditingSdg, setIsEditingSdg] = useState(false);
  const [tempSdgIds, setTempSdgIds] = useState([]);

  // Approval states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvingMember, setApprovingMember] = useState(null);

  // Member role edit states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editingMemberRoleType, setEditingMemberRoleType] = useState('MEMBER');
  const [editingMemberRoleName, setEditingMemberRoleName] = useState('');
  const [editingMemberGrantAdmin, setEditingMemberGrantAdmin] = useState(false);

  // New Help Modal State
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showContributorsModal, setShowContributorsModal] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [helpDescription, setHelpDescription] = useState('');
  const [selectedHelpMachine, setSelectedHelpMachine] = useState(null);
  const HELP_MACHINES = ['Imprimante 3D', 'Scanner 3D', 'Coupe Laser', 'Assemblage', 'Électronique'];

  // Deletion selection mode
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedJournals, setSelectedJournals] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [journalToDelete, setJournalToDelete] = useState(null);

  const project = userProjects.find(p => p.id === currentProjectId);
  if (!project) return null;

  // Computed permissions matrix
  const permissions = (() => {
    const isFounder = isCurrentUserId(currentUser, project.userId);
    const contributor = (project.contributors || []).find(c => isCurrentUserId(currentUser, c.userId));
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
  })();

  const handleApproveAction = () => {
    if (!approvingMember) return;

    const updatedContributors = project.contributors.map(item => {
      if (item.userId === approvingMember.userId) {
        const nextApprovals = Array.isArray(item.approvals) ? item.approvals : [];
        const approvals = nextApprovals.includes(currentUserId) ? nextApprovals : [...nextApprovals, currentUserId];
        return {
          ...item,
          approvals
        };
      }
      return item;
    });

    const target = updatedContributors.find(item => item.userId === approvingMember.userId);
    const hasAllAdminApprovals = activeAdmins.length <= 1 || activeAdmins.every(id => target.approvals && target.approvals.map(String).includes(String(id)));

    let finalContributors = updatedContributors;
    if (target.pendingRemove) {
      if (hasAllAdminApprovals) {
        finalContributors = updatedContributors.filter(item => item.userId !== approvingMember.userId);
        const binEntry = {
          id: Math.random().toString(36).substring(2, 15),
          type: 'member',
          projectId: project.id,
          projectName: project.title,
          memberData: { ...approvingMember, status: 'ACCEPTED' },
          deletedAt: new Date().toISOString()
        };
        saveRecycleBin([binEntry, ...(Array.isArray(recycleBin) ? recycleBin : [])]);
        showNotification("Contributeur retiré");
      } else {
        showNotification("Retrait approuvé, en attente des autres administrateurs");
      }
    } else {
      const hasMemberAcceptance = target.memberAccepted === true;
      if (hasAllAdminApprovals && hasMemberAcceptance) {
        finalContributors = updatedContributors.map(item => 
          item.userId === approvingMember.userId 
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
        showNotification("Action finalisée et approuvée !");
      } else {
        showNotification("Approuvé, en attente des autres validations");
      }
    }

    const updatedProjects = userProjects.map(p => 
      p.id === currentProjectId ? { ...p, contributors: finalContributors } : p
    );
    saveProjects(updatedProjects);
    setShowApprovalModal(false);
    setApprovingMember(null);
  };

  const handleRejectAction = () => {
    if (!approvingMember) return;
    let finalContributors;
    if (!approvingMember.pendingRole && !approvingMember.pendingRemove) {
      finalContributors = project.contributors.filter(item => item.userId !== approvingMember.userId);
    } else {
      finalContributors = project.contributors.map(item => 
        item.userId === approvingMember.userId 
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

    const updatedProjects = userProjects.map(p => 
      p.id === currentProjectId ? { ...p, contributors: finalContributors } : p
    );
    saveProjects(updatedProjects);
    showNotification("Action rejetée");
    setShowApprovalModal(false);
    setApprovingMember(null);
  };

  const handleMemberAccept = (contributor) => {
    const updatedContributors = project.contributors.map(c => {
      if (c.userId === contributor.userId) {
        return {
          ...c,
          memberAccepted: true
        };
      }
      return c;
    });

    const target = updatedContributors.find(item => item.userId === contributor.userId);
    const hasAllAdminApprovals = activeAdmins.length <= 1 || activeAdmins.every(id => target.approvals && target.approvals.map(String).includes(String(id)));

    let finalContributors = updatedContributors;
    if (hasAllAdminApprovals) {
      finalContributors = updatedContributors.map(c => 
        c.userId === contributor.userId 
          ? {
              ...c,
              role: c.pendingRole || c.role,
              accessLevel: c.pendingAccessLevel || c.accessLevel,
              isAdmin: c.pendingIsAdmin !== undefined ? c.pendingIsAdmin : c.isAdmin,
              status: 'ACCEPTED',
              pendingRole: null,
              pendingAccessLevel: null,
              pendingIsAdmin: null,
              approvals: null,
              memberAccepted: null
            }
          : c
      );
      showNotification("Invitation acceptée !");
    } else {
      showNotification("Invitation acceptée, en attente de la validation des administrateurs");
    }

    const updatedProjects = userProjects.map(p => 
      p.id === currentProjectId ? { ...p, contributors: finalContributors } : p
    );
    saveProjects(updatedProjects);
  };

  const handleMemberDecline = (contributor) => {
    let finalContributors;
    if (!contributor.pendingRole) {
      finalContributors = project.contributors.filter(c => c.userId !== contributor.userId);
    } else {
      finalContributors = project.contributors.map(c => 
        c.userId === contributor.userId 
          ? {
              ...c,
              status: 'ACCEPTED',
              pendingRole: null,
              pendingAccessLevel: null,
              pendingIsAdmin: null,
              approvals: null,
              memberAccepted: null
            }
          : c
      );
    }

    const updatedProjects = userProjects.map(p => 
      p.id === currentProjectId ? { ...p, contributors: finalContributors } : p
    );
    saveProjects(updatedProjects);
    showNotification("Invitation déclinée");
  };

  const activeAdmins = [
    project.userId,
    ...(project.contributors || [])
      .filter(c => c.status === 'ACCEPTED' && (c.accessLevel === 'CO_FOUNDER' || c.isAdmin))
      .map(c => c.userId)
  ];
  const handleSaveRoleChange = () => {
    if (!editingMember) return;

    let finalRole = '';
    let finalAccessLevel = 'MEMBER';
    let finalIsAdmin = false;

    if (editingMemberRoleType === 'CO_FOUNDER') {
      finalRole = 'Co-fondateur';
      finalAccessLevel = 'CO_FOUNDER';
      finalIsAdmin = true;
    } else if (editingMemberRoleType === 'MEMBER') {
      finalRole = 'Tuteur';
      finalAccessLevel = 'MEMBER';
      finalIsAdmin = false;
    } else {
      finalRole = editingMemberRoleName.trim() || 'Collaborateur';
      finalAccessLevel = 'MEMBER';
      finalIsAdmin = editingMemberGrantAdmin;
    }

    const updatedContributors = project.contributors.map(c => {
      if (c.userId === editingMember.userId) {
        return {
          ...c,
          status: 'PENDING',
          pendingRole: finalRole,
          pendingAccessLevel: finalAccessLevel,
          pendingIsAdmin: finalIsAdmin,
          approvals: [currentUserId],
          memberAccepted: false
        };
      }
      return c;
    });

    const target = updatedContributors.find(item => item.userId === editingMember.userId);
    const hasAllAdminApprovals = activeAdmins.length <= 1 || activeAdmins.every(id => target.approvals && target.approvals.map(String).includes(String(id)));
    const hasMemberAcceptance = target.memberAccepted;

    if (hasAllAdminApprovals && hasMemberAcceptance) {
      const finalized = updatedContributors.map(c => 
        c.userId === editingMember.userId 
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
      const updatedProjects = userProjects.map(p => 
        p.id === currentProjectId ? { ...p, contributors: finalized } : p
      );
      saveProjects(updatedProjects);
      showNotification("Rôle mis à jour");
    } else {
      const updatedProjects = userProjects.map(p => 
        p.id === currentProjectId ? { ...p, contributors: updatedContributors } : p
      );
      saveProjects(updatedProjects);
      showNotification("Changement de rôle soumis (en attente d'approbations/acceptation)");
    }

    setShowRoleModal(false);
    setEditingMember(null);
  };

  const handleMemberClick = (c) => {
    if (SYSTEM_SUPERVISOR_IDS.includes(c.userId)) {
      showNotification("Sara Ladouy est la Responsable du Fab Lab.");
      return;
    }
    const u = findUserByIdentity(usersList, c.userId, currentUser);
    if (!u) return;

    const entry = { selectedUser: null, currentProjectId: project.id, fromTab: TABS.MY_PROJECT };
    setNavigationHistory([entry]);
    if (isCurrentUserId(currentUser, u.id)) {
      setActiveTab('profile');
      setSelectedUser(null);
    } else {
      setSelectedUser(u);
      setActiveTab('profile');
    }
  };

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleModify = () => {
    setShowModify(true);
    setMenuOpen(false);
  };

  const saveEdits = (newTitle, newDesc, supervisorIds) => {
    const updated = userProjects.map(p =>
      p.id === currentProjectId
        ? { ...p, title: newTitle, description: newDesc, supervisorIds: supervisorIds ?? p.supervisorIds ?? ['user-sara'] }
        : p
    );
    saveProjects(updated);
    setShowModify(false);
  };

  const updateMainImage = (input) => {
    const file = input.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const updated = userProjects.map(p =>
        p.id === currentProjectId ? { ...p, image: e.target.result } : p
      );
      saveProjects(updated);
      showNotification("Image mise à jour");
    };
    reader.readAsDataURL(file);
  };

  const toggleDeleteMode = () => {
    setIsDeleteMode(!isDeleteMode);
    setSelectedJournals([]);
    setMenuOpen(false);
  };

  const handleJournalSelect = (id) => {
    if (selectedJournals.includes(id)) {
      setSelectedJournals(selectedJournals.filter(item => item !== id));
    } else {
      setSelectedJournals([...selectedJournals, id]);
    }
  };

  const confirmDeleteJournals = () => {
    if (selectedJournals.length === 0) {
      setIsDeleteMode(false);
      return;
    }

    try {
      const journalsToDelete = project.journals.filter(j => selectedJournals.includes(j.id));
      const remainingJournals = project.journals.filter(j => !selectedJournals.includes(j.id));

      // Add to recycle bin
      const recycleEntries = journalsToDelete.map(j => ({
        ...j,
        type: 'journal',
        projectId: project.id,
        projectName: project.title,
        deletedAt: new Date().toISOString()
      }));

      // Update projects list
      const updatedProjects = userProjects.map(p => {
        if (p.id === currentProjectId) {
          return { ...p, journals: remainingJournals };
        }
        return p;
      });

      // Save everything
      saveProjects(updatedProjects);
      saveRecycleBin([...recycleEntries, ...(Array.isArray(recycleBin) ? recycleBin : [])]);

      // Reset local state
      setIsDeleteMode(false);
      setSelectedJournals([]);
      setMenuOpen(false);

      showNotification(`${recycleEntries.length} journal(naux) supprimé(s)`, 'error');
    } catch (error) {
      console.error("Deletion error:", error);
      showNotification("Erreur lors de la suppression", 'error');
    }
  };

  const openJournalForm = () => {
    setActiveJournal(null);
    setShowJournalModal(true);
    setMenuOpen(false);
  };

  const saveJournal = (date, content, tempImage, phase, version) => {
    let updated;
    if (activeJournal) {
      // Editing existing
      const updatedJournals = project.journals.map(j =>
        j.id === activeJournal.id ? { ...j, date, content, image: tempImage, phase, version } : j
      );
      updated = userProjects.map(p =>
        p.id === currentProjectId ? { ...p, journals: updatedJournals } : p
      );
    } else {
      // Creating new
      const entry = { id: crypto.randomUUID(), date, content, image: tempImage, phase, version };
      updated = userProjects.map(p =>
        p.id === currentProjectId ? { ...p, journals: [entry, ...p.journals] } : p
      );
      recordPresenceActivity('journal:create', {
        projectId: project.id,
        projectTitle: project.title,
        journalId: entry.id,
        phase,
        version
      });
    }
    saveProjects(updated);
    setShowJournalModal(false);
    setActiveJournal(null);
  };

  const openJournalReader = (journal) => {
    if (isDeleteMode) {
      handleJournalSelect(journal.id);
      return;
    }
    setActiveJournal(journal);
    setShowJournalReader(true);
  };

  const handleEditFromReader = (journal) => {
    setShowJournalReader(false);
    setActiveJournal(journal);
    setShowJournalModal(true);
  };

  const handleDeleteFromReader = (journal) => {
    setShowJournalReader(false);
    setJournalToDelete(journal);
    setShowDeleteConfirm(true);
  };

  const executeJournalDelete = (journal) => {
    try {
      const remainingJournals = project.journals.filter(j => j.id !== journal.id);

      // Add to recycle bin
      const recycleEntry = {
        ...journal,
        type: 'journal',
        projectId: project.id,
        projectName: project.title,
        deletedAt: new Date().toISOString()
      };

      // Update projects list
      const updatedProjects = userProjects.map(p => {
        if (p.id === currentProjectId) {
          return { ...p, journals: remainingJournals };
        }
        return p;
      });

      // Save everything
      saveProjects(updatedProjects);
      saveRecycleBin([recycleEntry, ...(Array.isArray(recycleBin) ? recycleBin : [])]);

      showNotification("Journal déplacé dans la corbeille", 'error');
    } catch (error) {
      console.error("Deletion error:", error);
      showNotification("Erreur lors de la suppression", 'error');
    }
  };

  const groupedJournals = {};
  const phaseOrder = ['MOC', 'POC', 'MVP', 'READY_TO_MARKET'];
  (project.journals || []).forEach(j => {
    let p = j.phase || 'MOC';
    if (p === 'IDEA') p = 'MOC';
    if (p === 'PROTOTYPING') p = 'POC';
    if (!groupedJournals[p]) groupedJournals[p] = [];
    groupedJournals[p].push(j);
  });

  return (
    <div className="flex flex-col space-y-6 pb-24 relative p-6 lg:max-w-6xl lg:mx-auto lg:w-full lg:py-12 lg:px-12 lg:space-y-10 lg:pb-32">
      {/* Header with Hamburger */}
      <div className="flex items-center justify-between pt-4 px-2 lg:pt-0">
        <button onClick={onBack} className="p-2 text-t-tertiary hover:text-t-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1 flex flex-col items-center min-w-0 mx-4">
          <h2 className="text-xl font-bold text-t-primary text-center truncate w-full lg:text-4xl lg:tracking-tight">{project.title}</h2>
          <div className="mt-1.5 flex items-center justify-center space-x-3 animate-in fade-in slide-in-from-top-2 duration-700 delay-300">
            {/* Phase Button */}
            <button
              onClick={() => {
                if (permissions.canModifyProject) {
                  setShowPhaseModal(true);
                }
              }}
              className="px-3 py-1.5 rounded-2xl bg-t-surface-alt border border-t-border/50 shadow-sm active:scale-95 transition-all text-[9px] font-black text-[#3B5FE6] uppercase tracking-wider"
            >
              {((project.phase === 'IDEA' || !project.phase) ? 'MOC' : (project.phase === 'PROTOTYPING' ? 'POC' : project.phase)).replace(/_/g, ' ')}
            </button>

            {/* SDG Logos */}
            {project.sdgIds && project.sdgIds.length > 0 && (
              <div className="flex items-center space-x-1.5 pl-2 border-l border-t-border-strong">
                {project.sdgIds.map(id => {
                  const sdg = ALL_SDGS.find(s => s.id === id);
                  if (!sdg) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setTempSdgIds(project.sdgIds || []);
                        setIsEditingSdg(false);
                        setShowSdgModal(true);
                      }}
                      className="w-6 h-6 rounded-[2px] overflow-hidden shadow-md active:scale-95 transition-transform shrink-0"
                      title={`SDG ${sdg.number}`}
                    >
                      <img src={sdg.image} className="w-full h-full object-cover" alt={`SDG ${sdg.number}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <button onClick={toggleMenu} className="p-2 text-t-secondary hover:text-t-primary transition-colors relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 lg:h-7 lg:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" /></svg>
        </button>
      </div>

      {/* Dropdown Menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
          <div className="absolute top-16 right-4 w-48 bg-t-surface border border-t-border rounded-2xl shadow-2xl z-50 overflow-hidden">
            {permissions.canModifyProject && (
              <button onClick={handleModify} className="w-full p-4 text-left text-sm font-bold text-t-primary hover:bg-t-surface-alt border-b border-t-border-subtle flex items-center space-x-3">
                <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                <span>Modifier</span>
              </button>
            )}
            {permissions.canModifyTeam && (
              <button 
                onClick={() => {
                  setShowContributorsModal(true);
                  setMenuOpen(false);
                }} 
                className="w-full p-4 text-left text-sm font-bold text-t-primary hover:bg-t-surface-alt border-b border-t-border-subtle flex items-center space-x-3"
              >
                <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Contributeurs</span>
              </button>
            )}
            {permissions.canModifyTeam && (
              <button 
                onClick={() => {
                  setShowSupervisorModal(true);
                  setMenuOpen(false);
                }} 
                className="w-full p-4 text-left text-sm font-bold text-t-primary hover:bg-t-surface-alt border-b border-t-border-subtle flex items-center space-x-3"
              >
                <svg className="h-4 w-4 text-[#3B5FE6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Encadrant</span>
              </button>
            )}
            {permissions.canModifyProject && (
              <button 
                onClick={() => {
                  setShowPhaseModal(true);
                  setMenuOpen(false);
                }} 
                className="w-full p-4 text-left text-sm font-bold text-t-primary hover:bg-t-surface-alt border-b border-t-border-subtle flex items-center space-x-3"
              >
                <svg className="h-4 w-4 text-[#3B5FE6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Phase du Projet</span>
              </button>
            )}
            {permissions.canModifyProject && (
              <button 
                onClick={() => {
                  setShowSdgModal(true);
                  setIsEditingSdg(false);
                  setTempSdgIds(project.sdgIds || []);
                  setMenuOpen(false);
                }} 
                className="w-full p-4 text-left text-sm font-bold text-t-primary hover:bg-t-surface-alt border-b border-t-border-subtle flex items-center space-x-3"
              >
                <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span>Modify SDGs</span>
              </button>
            )}
            <button
              onClick={() => {
                const newNotif = {
                  id: 'review-' + Date.now(),
                  type: 'review_request',
                  senderId: currentUserId,
                  senderName: `${currentUser.prenom} ${currentUser.nom}`,
                  projectTitle: project.title,
                  projectId: project.id,
                  description: "Mon prototype est terminé et prêt pour la validation finale.",
                  time: 'Maintenant',
                  status: 'pending',
                  // level: 4
                };
                setNotifications([newNotif, ...notifications]);

                const updatedProjects = userProjects.map(p =>
                  p.id === project.id ? { ...p, reviewRequested: true, status: 'review_pending' } : p
                );
                saveProjects(updatedProjects);

                showNotification("Demande de revue envoyée avec succès !");
                setMenuOpen(false);
              }}
              className="w-full p-4 text-left text-sm font-bold text-t-primary hover:bg-t-surface-alt border-b border-t-border-subtle flex items-center space-x-3"
            >
              <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Ask for Review</span>
            </button>
            <button
              onClick={() => {
                setShowHelpModal(true);
                setMenuOpen(false);
              }}
              className="w-full p-4 text-left text-sm font-bold text-t-primary hover:bg-t-surface-alt border-b border-t-border-subtle flex items-center space-x-3"
            >
              <svg className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>Ask for Help</span>
            </button>
            <button onClick={openJournalForm} className="w-full p-4 text-left text-sm font-bold text-t-primary hover:bg-t-surface-alt border-b border-t-border-subtle flex items-center space-x-3">
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              <span>Ajouter Journal</span>
            </button>
            <button onClick={toggleDeleteMode} className="w-full p-4 text-left text-sm font-bold text-red-500 hover:bg-red-50 flex items-center space-x-3">
              <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <span>{isDeleteMode ? 'Annuler suppression' : 'Supprimer journal'}</span>
            </button>
          </div>
        </>
      )}

      {/* Project Info */}
      <div className="bg-t-surface rounded-[32px] p-6 shadow-sm border border-t-border space-y-4 mx-2 lg:p-10 lg:rounded-[40px] lg:shadow-xl lg:mx-0 lg:flex lg:flex-row-reverse lg:gap-12 lg:space-y-0 lg:items-start lg:border-none">
        {project.image && (
          <div className="w-full h-48 rounded-2xl overflow-hidden shadow-sm mt-2 lg:w-[40%] lg:h-72 lg:mt-0 lg:shadow-2xl lg:rounded-[32px] lg:shrink-0 lg:border-4 lg:border-white">
            <img src={project.image} className="w-full h-full object-cover" alt="Project" />
          </div>
        )}
        <div className="space-y-1 lg:flex-1 lg:space-y-4">
          <h3 className="text-[10px] font-bold text-t-muted uppercase tracking-[0.2em] lg:text-sm lg:tracking-widest">Description</h3>
          <div
            className="text-sm text-t-primary/80 font-medium leading-relaxed break-words overflow-wrap-anywhere rich-text-content lg:text-lg lg:leading-loose"
            dangerouslySetInnerHTML={{ __html: project.description }}
          />
        </div>
      </div>

      {/* Pending Member Acceptance Banner */}
      {(() => {
        const myContrib = project.contributors?.find(c => isCurrentUserId(currentUser, c.userId));
        if (myContrib && myContrib.status === 'PENDING' && !myContrib.memberAccepted) {
          return (
            <div className="mx-2 lg:mx-0 p-6 bg-blue-50 border border-blue-100 rounded-3xl flex flex-col space-y-4 animate-in fade-in slide-in-from-top-3 duration-500">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-[#3B5FE6] uppercase tracking-widest">Invitation au projet</span>
                <h4 className="text-sm font-bold text-t-primary">
                  {myContrib.pendingRole 
                    ? `Invitation à changer de rôle vers : ${myContrib.pendingRole}`
                    : `Vous avez été invité à rejoindre le projet en tant que : ${myContrib.role}`
                  }
                </h4>
                <p className="text-[11px] text-t-primary/50 font-semibold leading-relaxed">
                  Pour rejoindre l'équipe ou mettre à jour votre rôle, veuillez valider l'invitation ci-dessous.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleMemberDecline(myContrib)}
                  className="flex-1 py-3 bg-t-surface text-t-tertiary border border-t-border-strong font-bold rounded-2xl active:scale-[0.98] transition-all text-xs uppercase tracking-wider"
                >
                  Décliner
                </button>
                <button
                  onClick={() => handleMemberAccept(myContrib)}
                  className="flex-1 py-3 bg-[#3B5FE6] text-white font-black rounded-2xl active:scale-[0.98] transition-all text-xs uppercase tracking-wider shadow-lg shadow-blue-500/10"
                >
                  Accepter
                </button>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Team & Supervisors Unified Section */}
      <div className="space-y-3">
        {/* Team Section */}
        <div className="space-y-4 px-2 lg:px-0">
          <h3 className="text-[10px] font-bold text-t-muted uppercase tracking-[0.2em]">L'Équipe</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Founder (Always the user in ProjectDetail usually, but we use project.userId) */}
            {(() => {
              const u = findUserByIdentity(usersList, project.userId, currentUser);
              const colors = ['#FF6B6B', '#4ECDC4', '#3B5FE6', '#FF9F43', '#10AC84'];
              return (
                <button
                  onClick={() => handleMemberClick({ userId: project.userId, status: 'ACCEPTED', role: 'Fondateur' })}
                  className="flex items-center space-x-3 p-3 bg-t-surface rounded-2xl border border-t-border-subtle text-left transition-all active:scale-95 shadow-sm"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-sm shrink-0 uppercase"
                    style={{ backgroundColor: colors[0] }}
                  >
                    {u?.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover rounded-lg" /> : <span>{u?.prenom?.[0] || '?'}</span>}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-bold text-t-primary truncate">{u?.prenom} {u?.nom}</h4>
                    <p className="text-[7px] font-black text-t-muted uppercase tracking-widest">Fondateur</p>
                  </div>
                </button>
              );
            })()}

            {/* Contributors */}
            {(project.contributors || []).map((c, idx) => {
              const u = findUserByIdentity(usersList, c.userId, currentUser);
              const colors = ['#FF6B6B', '#4ECDC4', '#3B5FE6', '#FF9F43', '#10AC84'];
              const isPending = c.status !== 'ACCEPTED';
              return (
                <button
                  key={c.userId}
                  onClick={() => handleMemberClick(c)}
                  className={`flex items-center space-x-3 p-3 bg-t-surface rounded-2xl border border-t-border-subtle text-left transition-all active:scale-95 shadow-sm ${isPending ? 'opacity-50 animate-pulse' : ''}`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-sm shrink-0 uppercase"
                    style={{ backgroundColor: colors[(idx + 1) % colors.length] }}
                  >
                    {u?.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover rounded-lg" /> : <span>{u?.prenom?.[0] || '?'}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[11px] font-bold text-t-primary truncate">{u?.prenom} {u?.nom}</h4>
                    <p className="text-[7px] font-black text-t-muted uppercase tracking-widest flex flex-col">
                      <span>{c.role}</span>
                      {isPending && (
                        <span className="text-[#3B5FE6] font-bold text-[6px]">
                          {(() => {
                            const needsAdmin = !activeAdmins.every(id => c.approvals && c.approvals.map(String).includes(String(id)));
                            const needsMember = !c.memberAccepted;
                            if (needsAdmin && needsMember) return "(Attente Admin & Membre)";
                            if (needsAdmin) return "(Attente Admin)";
                            if (needsMember) return "(Attente Membre)";
                            return "(En attente)";
                          })()}
                        </span>
                      )}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Supervisor Section */}
        <div className="space-y-4 px-2 lg:px-0 pt-1 border-t border-t-border/30">
          <h3 className="text-[10px] font-bold text-t-muted uppercase tracking-[0.2em]">Encadrants</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* System Supervisor: Sara Ladouy */}
            <button
              onClick={() => handleMemberClick({ userId: 'system-sara', status: 'ACCEPTED', role: 'Responsable Fab Lab' })}
              className="flex items-center space-x-3 p-3 bg-[#3B5FE6] rounded-2xl border border-transparent text-left transition-all active:scale-95 shadow-sm text-white"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-[#3B5FE6] bg-t-surface shadow-sm shrink-0 uppercase"
              >
                S
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[11px] font-bold text-white truncate">Sara Ladouy</h4>
                <p className="text-[7px] font-black text-white/70 uppercase tracking-widest mt-0.5">Responsable Fab Lab</p>
              </div>
            </button>

            {/* Additional Project-specific Supervisors */}
            {(() => {
              const supervisorIds = project.supervisorIds || [];
              return supervisorIds.map(svId => {
                if (SYSTEM_SUPERVISOR_IDS.includes(svId)) return null;
                const sv = usersList.find(mu => mu.id === svId);
                if (!sv) return null;
                return (
                  <button
                    key={sv.id}
                    onClick={() => handleMemberClick({ userId: sv.id, status: 'ACCEPTED', role: 'Encadrant' })}
                    className="flex items-center space-x-3 p-3 bg-[#3B5FE6] rounded-2xl border border-transparent text-left transition-all active:scale-95 shadow-sm text-white"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-[#3B5FE6] bg-t-surface shadow-sm shrink-0 uppercase"
                    >
                      {sv?.avatar ? <img src={sv.avatar} alt="" className="w-full h-full object-cover rounded-lg" /> : <span>{sv?.prenom?.[0] || '?'}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[11px] font-bold text-white truncate">{sv?.prenom} {sv?.nom}</h4>
                      <p className="text-[7px] font-black text-white/70 uppercase tracking-widest mt-0.5 truncate">{supervisorSubtitle(sv)}</p>
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Journal Section */}
      <div className="space-y-4 px-2 lg:px-0 lg:mt-12 lg:bg-t-surface-alt lg:p-10 lg:rounded-[40px] lg:shadow-xl lg:border-none">
        <div className="flex justify-between items-center px-2 lg:px-1 lg:mb-8">
          <h3 className="text-[10px] font-bold text-t-muted uppercase tracking-[0.2em]">Journaux</h3>
          {isDeleteMode && (
            <button onClick={confirmDeleteJournals} className="px-4 py-2 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg animate-bounce">
              Confirmer ({selectedJournals.length})
            </button>
          )}
        </div>

        {(!project.journals || project.journals.length === 0) ? (
          <div className="text-center py-6 text-t-muted italic text-sm lg:py-16 lg:text-lg">Aucun journal</div>
        ) : (
          <div className="space-y-8">
            {phaseOrder.filter(phaseKey => groupedJournals[phaseKey] && groupedJournals[phaseKey].length > 0).map(phaseKey => (
              <div key={phaseKey} className="space-y-3">
                <div className="flex items-center space-x-2 border-b border-t-border pb-1">
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                    {phaseKey.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-bold text-t-muted">
                    ({groupedJournals[phaseKey].length} {groupedJournals[phaseKey].length > 1 ? 'journaux' : 'journal'})
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-6 lg:grid-cols-6 lg:gap-8 lg:gap-y-12">
                  {groupedJournals[phaseKey].map((j, idx) => (
                    <div key={j.id} className="relative group">
                      <button
                        onClick={() => openJournalReader(j)}
                        className={`w-full flex flex-col items-center space-y-2 transition-all active:scale-95 lg:bg-t-surface-alt/50 lg:p-6 lg:rounded-[32px] lg:border lg:border-t-border lg:hover:shadow-xl lg:hover:-translate-y-2 lg:hover:bg-t-surface-alt lg:duration-300 ${selectedJournals.includes(j.id) ? 'scale-90 opacity-50 ring-4 ring-red-500 rounded-[20px]' : ''
                          }`}
                      >
                        <div className="w-full aspect-square rounded-[20px] shadow-md flex items-center justify-center group-hover:rotate-2 transition-transform lg:w-24 lg:h-24 lg:rounded-3xl lg:shadow-lg lg:group-hover:rotate-6 lg:group-hover:scale-110 lg:duration-300" style={{ backgroundColor: JOURNAL_COLORS[idx % JOURNAL_COLORS.length] }}>
                          <svg className="h-8 w-8 text-white lg:h-10 lg:w-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M7 9H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M7 14H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <span className="text-[9px] font-bold text-t-secondary text-center uppercase tracking-tighter lg:text-xs lg:mt-6 lg:tracking-wide lg:text-t-primary/80">
                          {new Date(j.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </span>
                        {j.version && (
                          <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider scale-95 mt-0.5">
                            v{j.version}
                          </span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modify Modal */}
      {showModify && (
        <ModifyProjectModal project={project} onSave={saveEdits} onCancel={() => setShowModify(false)} updateMainImage={updateMainImage} />
      )}

      {/* Journal Modal */}
      {showJournalModal && (
        <JournalCreateModal
          onSave={saveJournal}
          onCancel={() => { setShowJournalModal(false); setActiveJournal(null); }}
          journal={activeJournal}
          defaultPhase={project.phase || 'MOC'}
        />
      )}

      {/* Journal Reader Modal */}
      <JournalReaderModal
        activeJournal={showJournalReader ? activeJournal : null}
        onClose={() => setShowJournalReader(false)}
        onEdit={handleEditFromReader}
        onDelete={handleDeleteFromReader}
      />

      {/* Ask for Help Modal (Bottom Sheet) */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[400] flex items-end justify-center bg-midnight-blue/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div
            className="fixed inset-0"
            onClick={() => setShowHelpModal(false)}
          ></div>
          <div className="bg-t-surface w-full max-w-lg rounded-t-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10 animate-in slide-in-from-bottom duration-500">
            {/* Handle Bar */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 shrink-0"></div>

            <div className="p-8 pb-4 flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-t-primary uppercase tracking-tighter">
                  Demander de l'aide
                </h3>
                <p className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest">Sur le projet: {project.title}</p>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 bg-t-surface-alt rounded-full text-t-muted hover:text-t-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8 custom-scrollbar">
              {/* Help Description Field */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Description de l'aide nécessaire</label>
                <textarea
                  value={helpDescription}
                  onChange={(e) => setHelpDescription(e.target.value)}
                  placeholder="Explique en quelques mots ce qui te bloque..."
                  className="w-full h-40 p-5 bg-t-surface-alt rounded-3xl border border-t-border focus:border-[#3B5FE6] focus:bg-t-surface outline-none text-sm font-medium transition-all resize-none custom-scrollbar"
                ></textarea>
              </div>

              {/* Help Machine Selection Chips */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Quelle machine est concernée ?</label>
                <div className="flex flex-wrap gap-2">
                  {HELP_MACHINES.map(machine => (
                    <button
                      key={machine}
                      onClick={() => setSelectedHelpMachine(machine === selectedHelpMachine ? null : machine)}
                      className={`px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all border ${selectedHelpMachine === machine
                          ? 'bg-[#3B5FE6] text-white border-[#3B5FE6] shadow-lg shadow-blue-500/20'
                          : 'bg-t-surface text-t-secondary border-t-border hover:border-[#3B5FE6]/30'
                        }`}
                    >
                      {machine}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 pt-4 shrink-0 bg-t-surface border-t border-t-border-subtle">
              <button
                disabled={!helpDescription.trim() || !selectedHelpMachine}
                onClick={() => {
                  const newNotif = {
                    id: 'help-' + Date.now(),
                    type: 'help_request',
                    senderId: currentUserId,
                    senderName: `${currentUser.prenom} ${currentUser.nom}`,
                    projectTitle: project.title,
                    projectId: project.id,
                    machineName: selectedHelpMachine,
                    description: helpDescription,
                    time: 'Maintenant',
                    status: 'pending',
                    // level: 4
                  };
                  setNotifications([newNotif, ...notifications]);

                  const updatedProjects = userProjects.map(p =>
                    p.id === project.id ? { ...p, helpRequested: true, helpMachine: selectedHelpMachine, helpDescription } : p
                  );
                  saveProjects(updatedProjects);

                  showNotification(`Demande d'aide envoyée avec succès !`);
                  setShowHelpModal(false);
                  setHelpDescription('');
                  setSelectedHelpMachine(null);
                }}
                className="w-full py-5 bg-[#3B5FE6] text-white font-black rounded-3xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all uppercase tracking-widest text-sm disabled:opacity-20"
              >
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contributors Modal */}
      {showContributorsModal && (
        <ContributorsModal
          project={project}
          onClose={() => setShowContributorsModal(false)}
          showNotification={showNotification}
          onSave={(updatedContributors) => {
            const updatedProjects = userProjects.map(p =>
              p.id === currentProjectId ? { ...p, contributors: updatedContributors } : p
            );
            saveProjects(updatedProjects);
          }}
        />
      )}

      {/* Supervisor Modal */}
      {showSupervisorModal && (
        <SupervisorModal
          project={project}
          onClose={() => setShowSupervisorModal(false)}
          onSave={(supervisorIds) => {
            const updatedProjects = userProjects.map(p =>
              p.id === currentProjectId ? { ...p, supervisorIds } : p
            );
            saveProjects(updatedProjects);
          }}
        />
      )}

      {/* Phase Modification Modal */}
      {showPhaseModal && (
        <div className="fixed inset-0 z-[150] flex items-start justify-center p-4 pt-24 bg-midnight-blue/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-t-surface w-full max-w-sm rounded-3xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-t-border/50">
              <h3 className="text-sm font-bold text-t-primary">Phase du Projet</h3>
              <button onClick={() => setShowPhaseModal(false)} className="p-1.5 text-t-tertiary hover:text-t-primary transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col space-y-5">
              {/* Row 1: MOC, POC */}
              <div className="flex justify-center space-x-2 w-full">
                {[
                  { id: 'MOC', label: 'MOC' },
                  { id: 'POC', label: 'POC' }
                ].map(phaseOption => {
                  const currentPhase = (project.phase === 'IDEA' || !project.phase) ? 'MOC' : (project.phase === 'PROTOTYPING' ? 'POC' : project.phase);
                  const isSelected = currentPhase === phaseOption.id;
                  return (
                    <button
                      key={phaseOption.id}
                      onClick={() => {
                        const updatedProjects = userProjects.map(p =>
                          p.id === currentProjectId ? { ...p, phase: phaseOption.id } : p
                        );
                        saveProjects(updatedProjects);
                        showNotification(`Phase mise à jour vers ${phaseOption.label}`);
                        setShowPhaseModal(false);
                      }}
                      className={`px-6 py-2 rounded-xl border text-xs font-black tracking-widest uppercase whitespace-nowrap transition-all active:scale-95 text-center ${
                        isSelected
                          ? 'border-[#3B5FE6] bg-[#3B5FE6] text-white shadow-sm'
                          : 'border-t-border/70 hover:border-t-border-strong text-t-primary/70 bg-t-surface-alt/50'
                      }`}
                    >
                      {phaseOption.label}
                    </button>
                  );
                })}
              </div>

              {/* Row 2: MVP and READY TO MARKET */}
              <div className="flex justify-center space-x-2 w-full">
                {[
                  { id: 'MVP', label: 'MVP' },
                  { id: 'READY_TO_MARKET', label: 'READY TO MARKET' }
                ].map(phaseOption => {
                  const currentPhase = (project.phase === 'IDEA' || !project.phase) ? 'MOC' : (project.phase === 'PROTOTYPING' ? 'POC' : project.phase);
                  const isSelected = currentPhase === phaseOption.id;
                  return (
                    <button
                      key={phaseOption.id}
                      onClick={() => {
                        const updatedProjects = userProjects.map(p =>
                          p.id === currentProjectId ? { ...p, phase: phaseOption.id } : p
                        );
                        saveProjects(updatedProjects);
                        showNotification(`Phase mise à jour vers ${phaseOption.label}`);
                        setShowPhaseModal(false);
                      }}
                      className={`px-6 py-2 rounded-xl border text-xs font-black tracking-widest uppercase whitespace-nowrap transition-all active:scale-95 text-center ${
                        isSelected
                          ? 'border-[#3B5FE6] bg-[#3B5FE6] text-white shadow-sm'
                          : 'border-t-border/70 hover:border-t-border-strong text-t-primary/70 bg-t-surface-alt/50'
                      }`}
                    >
                      {phaseOption.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SDG Modal */}
      {showSdgModal && (
        <div className="fixed inset-0 z-[400] flex items-end justify-center bg-midnight-blue/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="fixed inset-0" onClick={() => setShowSdgModal(false)}></div>
          <div className="bg-t-surface w-full max-w-lg rounded-t-[40px] shadow-2xl overflow-hidden flex flex-col h-[75vh] relative z-10 animate-in slide-in-from-bottom duration-500">
            {/* Handle Bar */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 shrink-0"></div>

            <div className="p-8 pb-4 flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-t-primary uppercase tracking-tighter">
                  Objectifs (SDG)
                </h3>
                <p className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest">
                  {isEditingSdg ? "Sélectionner jusqu'à 3 Objectifs" : "Objectifs liés à ce projet"}
                </p>
              </div>
              <button
                onClick={() => setShowSdgModal(false)}
                className="p-2 bg-t-surface-alt rounded-full text-t-muted hover:text-t-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 custom-scrollbar">
              {/* SDG Grid */}
              <div className="grid grid-cols-4 gap-3">
                {ALL_SDGS.map(sdg => {
                  const isSelected = tempSdgIds.includes(sdg.id);
                  return (
                    <button
                      key={sdg.id}
                      disabled={!isEditingSdg}
                      onClick={() => {
                        if (isSelected) {
                          setTempSdgIds(tempSdgIds.filter(id => id !== sdg.id));
                        } else {
                          if (tempSdgIds.length >= 3) {
                            showNotification("Vous pouvez sélectionner au maximum 3 SDGs.", "error");
                            return;
                          }
                          setTempSdgIds([...tempSdgIds, sdg.id]);
                        }
                      }}
                      className={`aspect-square rounded-md overflow-hidden transition-all relative ${isSelected
                          ? 'ring-4 ring-[#133853] scale-95 shadow-md'
                          : ''
                        }`}
                    >
                      <img src={sdg.image} className="w-full h-full object-cover" alt={`SDG ${sdg.number}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-8 pt-4 shrink-0 bg-t-surface border-t border-t-border-subtle">
              {isEditingSdg ? (
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setTempSdgIds(project.sdgIds || []);
                      setIsEditingSdg(false);
                    }}
                    className="w-1/3 py-4 bg-t-surface-input text-t-secondary font-bold rounded-2xl active:scale-[0.98] transition-all uppercase tracking-wider text-xs"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      const updatedProjects = userProjects.map(p =>
                        p.id === currentProjectId ? { ...p, sdgIds: tempSdgIds } : p
                      );
                      saveProjects(updatedProjects);
                      showNotification("SDGs enregistrés avec succès !");
                      setIsEditingSdg(false);
                      setShowSdgModal(false);
                    }}
                    className="flex-1 py-4 bg-[#3B5FE6] text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all uppercase tracking-wider text-xs"
                  >
                    Enregistrer ({tempSdgIds.length})
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingSdg(true)}
                  className="w-full py-5 bg-[#3B5FE6] text-white font-black rounded-3xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all uppercase tracking-widest text-sm"
                >
                  Modifier
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Approval Modal */}
      {showApprovalModal && approvingMember && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-midnight-blue/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-t-surface w-full max-w-sm rounded-[32px] shadow-2xl p-6 relative overflow-hidden flex flex-col space-y-6">
            <h3 className="text-lg font-black text-t-primary uppercase tracking-tight text-center">
              Validation requise
            </h3>
            
            <p className="text-sm text-t-secondary font-semibold text-center leading-relaxed">
              {(() => {
                const u = findUserByIdentity(usersList, approvingMember.userId, currentUser);
                const name = `${u?.prenom || ''} ${u?.nom || ''}`;
                if (approvingMember.pendingRemove) {
                  return `Approuver le retrait de ${name} du projet ?`;
                }
                if (approvingMember.pendingRole) {
                  return `Approuver le changement de rôle de ${name} vers ${approvingMember.pendingRole} ?`;
                }
                return `Approuver l'ajout de ${name} en tant que ${approvingMember.role} ?`;
              })()}
            </p>

            <div className="flex space-x-3">
              <button
                onClick={handleRejectAction}
                className="flex-1 py-3.5 bg-red-50 text-red-500 font-bold rounded-2xl active:scale-[0.98] transition-all text-xs uppercase tracking-wider"
              >
                Rejeter
              </button>
              <button
                onClick={handleApproveAction}
                className="flex-1 py-3.5 bg-[#3B5FE6] text-white font-black rounded-2xl active:scale-[0.98] transition-all text-xs uppercase tracking-wider shadow-lg shadow-blue-500/10"
              >
                Approuver
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Quick Role Edit Modal */}
      {showRoleModal && editingMember && (() => {
        const u = findUserByIdentity(usersList, editingMember.userId, currentUser);
        return (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-midnight-blue/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-t-surface w-full max-w-sm rounded-[32px] shadow-2xl p-6 relative overflow-hidden flex flex-col space-y-6 animate-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-xl font-black text-[#3B5FE6] border border-blue-100 shadow-sm shrink-0">
                  {u?.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover rounded-2xl" /> : <span>{u?.prenom?.[0]}</span>}
                </div>
                <div>
                  <h3 className="text-base font-black text-t-primary uppercase tracking-tight">
                    Modifier le rôle
                  </h3>
                  <p className="text-xs text-t-tertiary font-bold uppercase tracking-widest mt-0.5">
                    {u?.prenom} {u?.nom}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
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
                        onClick={() => {
                          setEditingMemberRoleType(item.type);
                          if (item.type === 'CO_FOUNDER') {
                            setEditingMemberRoleName('Co-fondateur');
                            setEditingMemberGrantAdmin(true);
                          } else if (item.type === 'MEMBER') {
                            setEditingMemberRoleName('Tuteur');
                            setEditingMemberGrantAdmin(false);
                          }
                        }}
                        className={`w-full p-4 rounded-2xl text-xs font-bold text-left border transition-all ${
                          editingMemberRoleType === item.type 
                            ? 'bg-blue-50/50 text-[#3B5FE6] border-[#3B5FE6] shadow-sm' 
                            : 'bg-t-surface text-t-secondary border-t-border'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {editingMemberRoleType === 'CUSTOM' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-t-tertiary uppercase tracking-widest px-1">Nom du rôle</label>
                      <input
                        autoFocus
                        type="text"
                        placeholder="ex: Designer, Lead Developer..."
                        className="w-full py-4 px-5 bg-t-surface-alt rounded-2xl border border-t-border focus:border-[#3B5FE6] focus:bg-t-surface outline-none text-sm font-bold transition-all text-t-primary"
                        value={editingMemberRoleName}
                        onChange={(e) => setEditingMemberRoleName(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2 px-1">
                      <input
                        type="checkbox"
                        id="edit-member-admin"
                        checked={editingMemberGrantAdmin}
                        onChange={(e) => setEditingMemberGrantAdmin(e.target.checked)}
                        className="w-5 h-5 rounded border-t-border-strong text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="edit-member-admin" className="text-xs font-bold text-t-secondary uppercase">
                        Accorder les accès administrateur projet
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => { setShowRoleModal(false); setEditingMember(null); }}
                  className="flex-1 py-3.5 bg-t-surface-alt text-t-secondary font-bold rounded-2xl active:scale-[0.98] transition-all text-xs uppercase tracking-wider"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveRoleChange}
                  disabled={!editingMemberRoleName.trim()}
                  className="flex-1 py-3.5 bg-[#3B5FE6] text-white font-black rounded-2xl active:scale-[0.98] transition-all text-xs uppercase tracking-wider shadow-lg shadow-blue-500/10 disabled:opacity-20"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Custom Delete Journal Confirmation Modal */}
      {showDeleteConfirm && journalToDelete && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-midnight-blue/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-t-surface w-full max-w-sm rounded-[32px] shadow-2xl p-6 relative overflow-hidden flex flex-col space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="h-6 w-6 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-t-primary uppercase tracking-tight">
                Supprimer le journal
              </h3>
              <p className="text-sm text-t-secondary font-semibold leading-relaxed">
                Voulez-vous vraiment supprimer ce journal ? Cette action le déplacera dans la corbeille.
              </p>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setJournalToDelete(null);
                }}
                className="w-1/2 py-3.5 bg-t-surface-alt text-t-secondary font-bold rounded-2xl active:scale-[0.98] transition-all uppercase tracking-wider text-xs text-center"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  executeJournalDelete(journalToDelete);
                  setShowDeleteConfirm(false);
                  setJournalToDelete(null);
                }}
                className="w-1/2 py-3.5 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-500/10 active:scale-[0.98] transition-all uppercase tracking-wider text-xs text-center"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
