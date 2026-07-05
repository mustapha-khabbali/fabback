import { useState } from 'react';
import ProjectHome from './ProjectHome';
import ProjectCreateForm from './ProjectCreateForm';
import ProjectDetailView from './ProjectDetailView';
import RecycleBinView from './RecycleBinView';
import ConfirmModal from './ConfirmModal';

const VIEWS = { HOME: 'home', CREATE: 'create', DETAIL: 'detail', RECYCLE: 'recycle' };

export default function ProjectsPanel({ projects, recycleBin, usersList, ownerId, onUpdateProjects, onUpdateRecycleBin, onAddUser }) {
  const [view, setView] = useState(VIEWS.HOME);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [permanentDeleteId, setPermanentDeleteId] = useState(null);

  const safeProjects = projects || [];
  const safeRecycleBin = recycleBin || [];

  const openProject = (id) => {
    setCurrentProjectId(id);
    setView(VIEWS.DETAIL);
  };

  const createProject = (newProject) => {
    onUpdateProjects([...safeProjects, newProject]);
    setView(VIEWS.HOME);
  };

  const updateProject = (updatedProject) => {
    onUpdateProjects(safeProjects.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
  };

  const moveProjectsToRecycle = (projectIds) => {
    const toDelete = safeProjects.filter((p) => projectIds.includes(p.id));
    const remaining = safeProjects.filter((p) => !projectIds.includes(p.id));
    const entries = toDelete.map((p) => ({ ...p, type: 'project', deletedAt: new Date().toISOString() }));
    onUpdateProjects(remaining);
    onUpdateRecycleBin([...entries, ...safeRecycleBin]);
  };

  const deleteCurrentProject = (projectId) => {
    moveProjectsToRecycle([projectId]);
    setView(VIEWS.HOME);
    setCurrentProjectId(null);
  };

  const moveJournalsToRecycle = (journalIds) => {
    const project = safeProjects.find((p) => p.id === currentProjectId);
    if (!project) return;
    const toDelete = (project.journals || []).filter((j) => journalIds.includes(j.id));
    const remaining = (project.journals || []).filter((j) => !journalIds.includes(j.id));
    const entries = toDelete.map((j) => ({ ...j, type: 'journal', projectId: project.id, projectName: project.title, deletedAt: new Date().toISOString() }));
    onUpdateProjects(safeProjects.map((p) => (p.id === project.id ? { ...p, journals: remaining } : p)));
    onUpdateRecycleBin([...entries, ...safeRecycleBin]);
  };

  const restoreFromRecycle = (item) => {
    if (item.type === 'journal') {
      const targetProject = safeProjects.find((p) => p.id === item.projectId);
      if (!targetProject) {
        onUpdateRecycleBin(safeRecycleBin.filter((i) => i.id !== item.id));
        return;
      }
      const { type, projectId, projectName, deletedAt, ...journalData } = item;
      onUpdateProjects(safeProjects.map((p) => (p.id === item.projectId ? { ...p, journals: [journalData, ...(p.journals || [])] } : p)));
    } else {
      const { type, deletedAt, ...projectData } = item;
      onUpdateProjects([projectData, ...safeProjects]);
    }
    onUpdateRecycleBin(safeRecycleBin.filter((i) => i.id !== item.id));
  };

  const permanentDelete = () => {
    onUpdateRecycleBin(safeRecycleBin.filter((i) => i.id !== permanentDeleteId));
    setPermanentDeleteId(null);
  };

  const currentProject = safeProjects.find((p) => p.id === currentProjectId);

  if (view === VIEWS.CREATE) {
    return <ProjectCreateForm onCreate={createProject} onBack={() => setView(VIEWS.HOME)} />;
  }

  if (view === VIEWS.RECYCLE) {
    return (
      <RecycleBinView
        recycleBin={safeRecycleBin}
        onRestore={restoreFromRecycle}
        onPermanentDelete={(id) => setPermanentDeleteId(id)}
        onBack={() => setView(VIEWS.HOME)}
      />
    );
  }

  if (view === VIEWS.DETAIL && currentProject) {
    return (
      <>
        <ProjectDetailView
          project={currentProject}
          usersList={usersList || []}
          ownerId={ownerId}
          onBack={() => { setView(VIEWS.HOME); setCurrentProjectId(null); }}
          onUpdateProject={updateProject}
          onMoveJournalsToRecycle={moveJournalsToRecycle}
          onDeleteProject={deleteCurrentProject}
          onAddUser={onAddUser}
        />
        {permanentDeleteId && (
          <ConfirmModal
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
            iconBg="bg-accent-red/10"
            iconColor="text-accent-red"
            title="Supprimer définitivement ?"
            description="Cette action est irréversible."
            confirmLabel="Oui, supprimer"
            danger
            onConfirm={permanentDelete}
            onCancel={() => setPermanentDeleteId(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <ProjectHome
        projects={safeProjects}
        onOpenProject={openProject}
        onCreateProject={() => setView(VIEWS.CREATE)}
        onShowRecycle={() => setView(VIEWS.RECYCLE)}
        onMoveToRecycle={moveProjectsToRecycle}
      />
      {permanentDeleteId && (
        <ConfirmModal
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
          iconBg="bg-accent-red/10"
          iconColor="text-accent-red"
          title="Supprimer définitivement ?"
          description="Cette action est irréversible."
          confirmLabel="Oui, supprimer"
          danger
          onConfirm={permanentDelete}
          onCancel={() => setPermanentDeleteId(null)}
        />
      )}
    </>
  );
}
