import { useState } from 'react';
import { JOURNAL_COLORS, PHASE_ORDER, ALL_SDGS, groupJournalsByPhase, normalizePhase } from '../../utils/projectUtils';
import ModifyProjectModal from './ModifyProjectModal';
import PhaseModal from './PhaseModal';
import SdgModal from './SdgModal';
import JournalFormModal from './JournalFormModal';
import JournalReaderModal from './JournalReaderModal';
import ConfirmModal from './ConfirmModal';
import ImageLightbox from './ImageLightbox';
import TeamSection from './TeamSection';
import SupervisorSection from './SupervisorSection';

export default function ProjectDetailView({ project, usersList = [], ownerId, onBack, onUpdateProject, onMoveJournalsToRecycle, onDeleteProject, onAddUser }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showModify, setShowModify] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [showSdgModal, setShowSdgModal] = useState(false);
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [editingJournal, setEditingJournal] = useState(null);
  const [readingJournal, setReadingJournal] = useState(null);
  const [journalToDelete, setJournalToDelete] = useState(null);

  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedJournalIds, setSelectedJournalIds] = useState([]);

  const groupedJournals = groupJournalsByPhase(project.journals);

  const saveModify = (title, description, image) => {
    onUpdateProject({ ...project, title, description, image });
    setShowModify(false);
  };

  const selectPhase = (phase) => {
    onUpdateProject({ ...project, phase });
    setShowPhaseModal(false);
  };

  const saveSdgs = (sdgIds) => {
    onUpdateProject({ ...project, sdgIds });
    setShowSdgModal(false);
  };

  const saveContributors = (nextContributors) => {
    onUpdateProject({ ...project, contributors: nextContributors });
  };

  const saveSupervisors = (nextSupervisorIds) => {
    onUpdateProject({ ...project, supervisorIds: nextSupervisorIds });
  };

  const openJournalForm = (journal = null) => {
    setEditingJournal(journal);
    setShowJournalForm(true);
  };

  const saveJournal = (journalData) => {
    const exists = (project.journals || []).some((j) => j.id === journalData.id);
    const updatedJournals = exists
      ? project.journals.map((j) => (j.id === journalData.id ? journalData : j))
      : [journalData, ...(project.journals || [])];
    onUpdateProject({ ...project, journals: updatedJournals });
    setShowJournalForm(false);
    setEditingJournal(null);
    setReadingJournal(journalData);
  };

  const toggleDeleteMode = () => {
    setIsDeleteMode(!isDeleteMode);
    setSelectedJournalIds([]);
  };

  const handleJournalClick = (journal) => {
    if (isDeleteMode) {
      setSelectedJournalIds(
        selectedJournalIds.includes(journal.id)
          ? selectedJournalIds.filter((id) => id !== journal.id)
          : [...selectedJournalIds, journal.id]
      );
      return;
    }
    setReadingJournal(journal);
  };

  const confirmBulkDelete = () => {
    if (selectedJournalIds.length === 0) {
      setIsDeleteMode(false);
      return;
    }
    onMoveJournalsToRecycle(selectedJournalIds);
    setSelectedJournalIds([]);
    setIsDeleteMode(false);
  };

  const handleEditFromReader = (journal) => {
    setReadingJournal(null);
    openJournalForm(journal);
  };

  const handleDeleteFromReader = (journal) => {
    setReadingJournal(null);
    setJournalToDelete(journal);
  };

  const currentPhase = normalizePhase(project.phase);

  if (showJournalForm) {
    return (
      <JournalFormModal
        journal={editingJournal}
        defaultPhase={project.phase || 'MOC'}
        onSave={saveJournal}
        onBack={() => {
          const wasEditing = editingJournal;
          setShowJournalForm(false);
          setEditingJournal(null);
          if (wasEditing) setReadingJournal(wasEditing);
        }}
      />
    );
  }

  if (readingJournal) {
    return (
      <JournalReaderModal
        journal={readingJournal}
        onBack={() => setReadingJournal(null)}
        onEdit={handleEditFromReader}
        onDelete={handleDeleteFromReader}
      />
    );
  }

  return (
    <div className="section-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 relative">
        <button
          onClick={onBack}
          className="p-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/60 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div className="flex-1 flex flex-col items-center min-w-0 px-4">
          <h4 className="text-[15px] font-bold text-white text-center truncate w-full">{project.title}</h4>
          <div className="mt-1.5 flex items-center gap-2">
            <button
              onClick={() => setShowPhaseModal(true)}
              className="px-2.5 py-1 rounded-lg bg-accent-blue/10 text-accent-blue text-[9px] font-black uppercase tracking-wider cursor-pointer hover:bg-accent-blue/20 transition-colors"
            >
              {currentPhase.replace(/_/g, ' ')}
            </button>
            {(project.sdgIds || []).length > 0 && (
              <div className="flex items-center gap-1 pl-2 border-l border-white/10">
                {project.sdgIds.map((id) => {
                  const sdg = ALL_SDGS.find((s) => s.id === id);
                  if (!sdg) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => setShowSdgModal(true)}
                      className="w-5 h-5 rounded-[2px] overflow-hidden shadow-sm cursor-pointer shrink-0"
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

        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/60 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute top-11 right-0 w-52 bg-[#151b2e] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => { setShowModify(true); setMenuOpen(false); }}
                  className="w-full px-4 py-3 text-left text-[12px] font-bold text-white hover:bg-white/[0.06] border-b border-white/[0.06] flex items-center gap-3 cursor-pointer"
                >
                  <svg className="h-4 w-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  <span>Modifier</span>
                </button>
                <button
                  onClick={() => { openJournalForm(null); setMenuOpen(false); }}
                  className="w-full px-4 py-3 text-left text-[12px] font-bold text-white hover:bg-white/[0.06] border-b border-white/[0.06] flex items-center gap-3 cursor-pointer"
                >
                  <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  <span>Ajouter Journal</span>
                </button>
                <button
                  onClick={() => { setShowSdgModal(true); setMenuOpen(false); }}
                  className="w-full px-4 py-3 text-left text-[12px] font-bold text-white hover:bg-white/[0.06] border-b border-white/[0.06] flex items-center gap-3 cursor-pointer"
                >
                  <svg className="h-4 w-4 text-accent-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                  <span>Modifier SDGs</span>
                </button>
                <button
                  onClick={() => { toggleDeleteMode(); setMenuOpen(false); }}
                  className="w-full px-4 py-3 text-left text-[12px] font-bold text-accent-red hover:bg-accent-red/10 border-b border-white/[0.06] flex items-center gap-3 cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  <span>{isDeleteMode ? 'Annuler suppression' : 'Supprimer journal'}</span>
                </button>
                <button
                  onClick={() => { setShowDeleteProject(true); setMenuOpen(false); }}
                  className="w-full px-4 py-3 text-left text-[12px] font-bold text-accent-red hover:bg-accent-red/10 flex items-center gap-3 cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M10 12v6m4-6v6M6 8l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 8V5a1 1 0 011-1h4a1 1 0 011 1v3" /></svg>
                  <span>Supprimer le projet</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isDeleteMode && (
        <div className="flex justify-end mb-4 -mt-3">
          <span className="text-[10px] font-bold text-accent-red uppercase tracking-widest bg-accent-red/10 px-3 py-1.5 rounded-lg">
            Mode suppression actif — sélectionnez des journaux
          </span>
        </div>
      )}

      {/* Description */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5 mb-6">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-[2px] mb-2">Description</p>
        <div
          className="rich-text-content text-[13px] text-white/70 leading-relaxed break-words"
          dangerouslySetInnerHTML={{ __html: project.description }}
        />
      </div>

      {/* Project image */}
      {project.image && (
        <button
          onClick={() => setShowLightbox(true)}
          className="block w-full rounded-lg overflow-hidden mb-6 bg-white/[0.03] cursor-zoom-in"
        >
          <img src={project.image} className="w-full h-auto max-h-[320px] object-contain mx-auto" alt={project.title} />
        </button>
      )}

      <TeamSection
        contributors={project.contributors || []}
        usersList={usersList}
        ownerId={ownerId}
        onSave={saveContributors}
      />

      <SupervisorSection
        supervisorIds={project.supervisorIds || []}
        usersList={usersList}
        onSave={saveSupervisors}
        onAddUser={onAddUser}
      />

      {/* Journals */}
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Journaux</h5>
        {isDeleteMode && (
          <button onClick={confirmBulkDelete} className="px-4 py-2 bg-accent-red text-white text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-lg cursor-pointer">
            Confirmer ({selectedJournalIds.length})
          </button>
        )}
      </div>

      {(!project.journals || project.journals.length === 0) ? (
        <div className="text-center py-6 text-white/20 italic text-[13px]">Aucun journal</div>
      ) : (
        <div className="space-y-6">
          {PHASE_ORDER.filter((phaseKey) => groupedJournals[phaseKey]?.length > 0).map((phaseKey) => (
            <div key={phaseKey} className="space-y-2.5">
              <div className="flex items-center space-x-1.5 border-b border-white/[0.06] pb-1.5">
                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                  {phaseKey.replace(/_/g, ' ')}
                </span>
                <span className="text-[9px] font-bold text-white/20">({groupedJournals[phaseKey].length})</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-5">
                {groupedJournals[phaseKey].map((j, idx) => {
                  const isSelected = selectedJournalIds.includes(j.id);
                  return (
                    <button
                      key={j.id}
                      onClick={() => handleJournalClick(j)}
                      className={`flex flex-col items-center space-y-1.5 transition-all active:scale-95 group cursor-pointer ${isSelected ? 'scale-90 opacity-70' : ''}`}
                    >
                      <div
                        className={`w-full aspect-square rounded-[16px] shadow-md flex items-center justify-center group-hover:rotate-2 transition-transform ${isSelected ? 'ring-4 ring-accent-red' : ''}`}
                        style={{ backgroundColor: JOURNAL_COLORS[idx % JOURNAL_COLORS.length] }}
                      >
                        <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M7 9H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M7 14H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className="text-[9px] font-bold text-white/50 text-center uppercase tracking-tighter">
                        {new Date(j.date || j.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </span>
                      {j.version && (
                        <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          v{j.version}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModify && (
        <ModifyProjectModal project={project} onSave={saveModify} onCancel={() => setShowModify(false)} />
      )}

      {showPhaseModal && (
        <PhaseModal currentPhase={currentPhase} onSelect={selectPhase} onClose={() => setShowPhaseModal(false)} />
      )}

      {showSdgModal && (
        <SdgModal sdgIds={project.sdgIds} onSave={saveSdgs} onClose={() => setShowSdgModal(false)} />
      )}

      {showDeleteProject && (
        <ConfirmModal
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
          iconBg="bg-accent-red/10"
          iconColor="text-accent-red"
          title="Supprimer ce projet ?"
          description={`« ${project.title} » et tous ses journaux seront déplacés dans la corbeille.`}
          confirmLabel="Oui, supprimer"
          danger
          onConfirm={() => { setShowDeleteProject(false); onDeleteProject && onDeleteProject(project.id); }}
          onCancel={() => setShowDeleteProject(false)}
        />
      )}

      {journalToDelete && (
        <ConfirmModal
          icon={<path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
          iconBg="bg-accent-red/10"
          iconColor="text-accent-red"
          title="Supprimer le journal ?"
          description="Ce journal sera déplacé dans la corbeille."
          confirmLabel="Oui, supprimer"
          danger
          onConfirm={() => { onMoveJournalsToRecycle([journalToDelete.id]); setJournalToDelete(null); }}
          onCancel={() => setJournalToDelete(null)}
        />
      )}

      {showLightbox && (
        <ImageLightbox src={project.image} alt={project.title} onClose={() => setShowLightbox(false)} />
      )}
    </div>
  );
}
