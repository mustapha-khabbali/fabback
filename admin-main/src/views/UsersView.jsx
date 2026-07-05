import { useState, useRef, useEffect, useMemo } from 'react';
import { poleOptions, niveauOptions, yearOptions, getFiliereOptions, getOptionChoices } from '../data/trainingData';
import ProjectsPanel from '../components/projects/ProjectsPanel';
import AddUserModal from '../components/users/AddUserModal';

export const MOCK_USERS = [
  {
    id: 'user-1',
    prenom: 'Ahmed',
    nom: 'El Mansouri',
    role: 'Stagiaire',
    email: 'ahmed@example.com',
    tel: '0612345678',
    cin: 'AB123456',
    cef: 'CEF-001',
    pole: 'digital et intelligence artificiel',
    niveau: 'Technicien Spécialisé',
    filiere: 'Développement Digital',
    year: '1ère année',
    bio: 'Passionné par la robotique et le prototypage.',
    points: 450,
    machines: [
      { name: 'Impression 3D', level: 'Expert', color: 'bg-emerald-500' },
      { name: 'Découpe Laser', level: 'Intermédiaire', color: 'bg-blue-500' },
      { name: 'Fraisage CNC', level: 'Débutant', color: 'bg-amber-500' }
    ],
    programs: [
      { name: 'Hackathon FabLab 2024', type: 'Hackathon', result: 'Win' },
      { name: 'Introduction to IoT', type: 'Workshop', result: 'Participation' }
    ],
    projects: [
      {
        id: 'proj-3', title: "🔋 Système d'Énergie Solaire Intelligent", description: "Optimisation de la consommation d'énergie pour une station météo autonome via un panneau solaire et une batterie Li-ion.", phase: 'POC',
        journals: [
          { id: 'jr-1', date: '2024-02-10', phase: 'MOC', version: 1, content: "Première esquisse du montage solaire et choix des composants." },
          { id: 'jr-2', date: '2024-03-04', phase: 'POC', version: 1, content: "Test de charge de la batterie Li-ion avec le panneau solaire." },
          { id: 'jr-3', date: '2024-03-20', phase: 'POC', version: 2, content: "Optimisation du rendement via un régulateur MPPT." }
        ]
      },
      {
        id: 'proj-4', title: "🛸 Dronix : Drone de Surveillance", description: "Développement d'un quadricoptère autonome pour la surveillance des zones agricoles, équipé d'une caméra thermique.", phase: 'MVP',
        journals: [
          { id: 'jr-4', date: '2024-04-02', phase: 'MVP', version: 1, content: "Intégration de la caméra thermique sur le châssis du drone." }
        ]
      }
    ],
    checkins: 45
  },
  {
    id: 'user-2',
    prenom: 'Laila',
    nom: 'Bennani',
    role: 'Stagiaire',
    email: 'laila@example.com',
    tel: '0600112233',
    cin: 'CD778899',
    cef: 'CEF-002',
    pole: 'digital et intelligence artificiel',
    niveau: 'Technicien Spécialisé',
    filiere: 'Développement Digital',
    year: '2ème année',
    option: 'Web Fullstack',
    bio: 'Stagiaire active sur les événements FabLab et les ateliers collaboratifs.',
    points: 120,
    machines: [
      { name: 'Impression 3D', level: 'Débutant', color: 'bg-amber-500' }
    ],
    programs: [],
    projects: [
      { id: 'proj-2', title: 'Robot Solaire Autonome', description: "Un petit robot capable de suivre la lumière du soleil pour optimiser sa charge, conçu avec une structure découpée au laser.", phase: 'MOC' }
    ],
    checkins: 20
  },
  {
    id: 'user-3',
    prenom: 'Ahmed',
    nom: 'Mansouri',
    role: 'Administrateur',
    email: 'admin@fabweb.com',
    tel: '0655443322',
    cin: 'EF998877',
    bio: 'Membre du corps administratif de l\'établissement.',
    points: 0
  },
  {
    id: 'user-4',
    prenom: 'Siham',
    nom: 'Alaoui',
    role: 'Formateur',
    email: 'siham@fabweb.com',
    tel: '0611223344',
    cin: 'CD112233',
    cef: 'N/A',
    pole: 'Industrie',
    bio: 'Formatrice en conception assistée par ordinateur.',
    points: 0
  },
  {
    id: 'user-5',
    prenom: 'Pierre',
    nom: 'Dupont',
    role: 'Visiteur',
    email: 'pierre.dupont@visitor.com',
    tel: '0677889900',
    cin: 'XY554433',
    cef: 'N/A',
    bio: 'Visiteur curieux intéressé par l\'impression 3D et le prototypage rapide.',
    points: 0
  },
  {
    id: 'admin-resp-entrepreneuriat',
    prenom: 'xxxx',
    nom: 'xxxx',
    role: 'Administrateur',
    email: '',
    tel: '',
    cin: '',
    bio: 'Responsable Entrepreneuriat',
    points: 0
  },
  {
    id: 'admin-resp-incubateur',
    prenom: 'xxxx',
    nom: 'xxxx',
    role: 'Administrateur',
    email: '',
    tel: '',
    cin: '',
    bio: 'Responsable Incubateur',
    points: 0
  }
];

const ALL_COLUMNS = [
  { id: 'nom', label: 'Nom' },
  { id: 'prenom', label: 'Prénom' },
  { id: 'role', label: 'Type' },
  { id: 'email', label: 'Email' },
  { id: 'tel', label: 'Phone Number' },
  { id: 'cin', label: 'CIN' }
];

export default function UsersView({ profileTarget, onProfileTargetHandled }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [visibleColumns, setVisibleColumns] = useState({
    nom: true,
    prenom: true,
    role: true,
    email: true,
    tel: true,
    cin: true
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const dropdownRef = useRef(null);

  const [users, setUsers] = useState(MOCK_USERS);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState('info');

  const handleStartEdit = () => {
    setEditForm({ ...selectedUser });
    setIsEditing(true);
  };

  const patchSelectedUser = (patch) => {
    setUsers((prevUsers) => prevUsers.map((u) => (u.id === selectedUser.id ? { ...u, ...patch } : u)));
    setSelectedUser((prev) => ({ ...prev, ...patch }));
  };

  const updateSelectedUserProjects = (newProjects) => patchSelectedUser({ projects: newProjects });
  const updateSelectedUserRecycleBin = (newBin) => patchSelectedUser({ recycleBin: newBin });

  const updateStagiaireRating = (rating) => {
    if (!selectedUser || selectedUser.role !== 'Stagiaire') return;
    patchSelectedUser({ comportementRating: rating });
  };

  // Append a newly created user (e.g. a new encadrant added on the fly from a project)
  const addUser = (newUser) => setUsers((prevUsers) => [...prevUsers, newUser]);

  const updateEditForm = (field, value) => {
    const newForm = { ...editForm, [field]: value };
    // Reset dependent fields, same cascade as the Stagiaire signup form
    if (field === 'pole' || field === 'niveau') {
      newForm.filiere = '';
      newForm.option = '';
    }
    if (field === 'filiere' || field === 'year') {
      newForm.option = '';
    }
    setEditForm(newForm);
  };

  const editFiliereList = useMemo(() => getFiliereOptions(editForm?.pole, editForm?.niveau), [editForm?.pole, editForm?.niveau]);
  const editOptionList = useMemo(() => getOptionChoices(editForm?.pole, editForm?.niveau, editForm?.filiere, editForm?.year), [editForm?.pole, editForm?.niveau, editForm?.filiere, editForm?.year]);

  const handleSaveEdit = () => {
    if (!editForm.nom?.trim() || !editForm.prenom?.trim()) {
      alert("Le nom et le prénom ne peuvent pas être vides.");
      return;
    }
    const updatedUsers = users.map(u => u.id === selectedUser.id ? { ...u, ...editForm } : u);
    setUsers(updatedUsers);
    setSelectedUser({ ...selectedUser, ...editForm });
    setIsEditing(false);
    setEditForm(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  const confirmToggleDeactivate = () => {
    const nextDeactivatedState = !selectedUser.isDeactivated;
    const updatedUsers = users.map(u => u.id === selectedUser.id ? { ...u, isDeactivated: nextDeactivatedState } : u);
    setUsers(updatedUsers);
    setSelectedUser({ ...selectedUser, isDeactivated: nextDeactivatedState });
    setShowDeactivateModal(false);
  };

  const removeUserFromProjectRefs = (project) => ({
    ...project,
    supervisorIds: (project.supervisorIds || []).filter((id) => id !== selectedUser.id),
    contributors: (project.contributors || []).filter((c) => c.userId !== selectedUser.id)
  });

  const confirmRemoveProfile = () => {
    const updatedUsers = users
      .filter(u => u.id !== selectedUser.id)
      .map((u) => ({
        ...u,
        projects: (u.projects || []).map(removeUserFromProjectRefs)
      }));
    setUsers(updatedUsers);
    setSelectedUser(null);
    setIsEditing(false);
    setEditForm(null);
    setShowRemoveModal(false);
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowColumnDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleColumn = (colId) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [colId]: !prev[colId]
    }));
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.nom?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.prenom?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.id?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesRole = selectedRole === 'All' || user.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  useEffect(() => {
    if (!profileTarget) return;

    const normalize = (value) => String(value || '').trim().toLowerCase();
    const targetId = normalize(profileTarget.userId || profileTarget.id);
    const targetCin = normalize(profileTarget.cin);
    const targetEmail = normalize(profileTarget.email);
    const targetName = normalize(profileTarget.name || `${profileTarget.prenom || ''} ${profileTarget.nom || ''}`);

    const user = users.find((candidate) => {
      const candidateName = normalize(`${candidate.prenom || ''} ${candidate.nom || ''}`);
      return (
        normalize(candidate.id) === targetId ||
        (targetCin && normalize(candidate.cin) === targetCin) ||
        (targetEmail && normalize(candidate.email) === targetEmail) ||
        (targetName && candidateName === targetName)
      );
    });

    if (user) {
      setSelectedUser(user);
      setActiveProfileTab('info');
    }
    onProfileTargetHandled?.();
  }, [profileTarget, users, onProfileTargetHandled]);

  // If a user profile is clicked, show the full detailed screen
  if (selectedUser) {
    const isStagiaire = selectedUser.role === 'Stagiaire';

    return (
      <section className="animate-in fade-in duration-300">
        {/* Profile Header */}
        <div className="mb-7 mt-2 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedUser(null)}
              className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl active:scale-95 transition-all cursor-pointer border border-white/5"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Dynamic Desktop Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          
          {/* Column 1: Header + À propos + Contact Details */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Avatar & Identity Header Card */}
            <div className="section-card p-6 flex flex-col items-center text-center">
              <div className="w-28 h-28 bg-white/5 border border-white/10 rounded-full flex items-center justify-center overflow-hidden shadow-xl mb-4 relative text-white">
                <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">{selectedUser.prenom} {selectedUser.nom}</h3>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {selectedUser.isDeactivated && (
                  <span className="inline-block px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider bg-accent-red/10 text-accent-red border border-accent-red/20">
                    Désactivé
                  </span>
                )}
                <span
                  className={`inline-block px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                    selectedUser.role === 'Stagiaire'
                      ? 'bg-accent-green/10 text-accent-green'
                      : selectedUser.role === 'Formateur'
                      ? 'bg-accent-blue/10 text-accent-blue'
                      : selectedUser.role === 'Administrateur'
                      ? 'bg-accent-purple/10 text-accent-purple'
                      : 'bg-accent-amber/10 text-accent-amber'
                  }`}
                >
                  {selectedUser.role}
                </span>

              </div>
            </div>

            {/* Biography Card (À propos) - White Border */}
            <div className="section-card p-6 border-t-4 border-t-white">
              <h4 className="text-[11px] font-bold text-white uppercase tracking-[2px] mb-3">
                À propos
              </h4>
              <p className="text-[13px] leading-relaxed text-white/70 font-medium">{selectedUser.bio}</p>
            </div>

            {isStagiaire && (
              <div className="section-card p-6 border-t-4 border-t-accent-amber">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[2px]">
                    Comportement
                  </h4>
                  <span className="text-[11px] font-bold text-accent-amber">
                    {selectedUser.comportementRating || 0}/5
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isActive = star <= (selectedUser.comportementRating || 0);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => updateStagiaireRating(star)}
                        className={`p-1 rounded-lg transition-all cursor-pointer hover:scale-110 ${
                          isActive ? 'text-accent-amber bg-accent-amber/10' : 'text-white/20 hover:text-accent-amber hover:bg-white/[0.04]'
                        }`}
                        aria-label={`Noter ${star} sur 5`}
                      >
                        <svg className="w-7 h-7 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions Card */}
            <div className="section-card p-6 border-t-4 border-t-white/10">
              <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[2px] mb-4">
                Actions
              </h4>
              <div className="flex flex-col space-y-3">
                {isEditing ? (
                  <>
                    {/* Enregistrer */}
                    <button 
                      onClick={handleSaveEdit}
                      className="w-full bg-accent-blue hover:bg-accent-blue/85 text-white text-[12px] font-bold py-3 px-4 rounded-xl flex items-center justify-between transition-colors cursor-pointer shadow-[0_4px_12px_rgba(0,117,255,0.2)]"
                    >
                      <span>Enregistrer</span>
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    {/* Annuler */}
                    <button 
                      onClick={handleCancelEdit}
                      className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[12px] font-bold py-3 px-4 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Annuler</span>
                      <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Modifier */}
                    <button 
                      onClick={handleStartEdit}
                      className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[12px] font-bold py-3 px-4 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Modifier le profil</span>
                      <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                      </svg>
                    </button>

                    {/* Désactiver / Réactiver */}
                    <button
                      onClick={() => setShowDeactivateModal(true)}
                      className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[12px] font-bold py-3 px-4 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>{selectedUser.isDeactivated ? 'Réactiver le profil' : 'Désactiver le profil'}</span>
                      <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.36 18.36A9 9 0 015.64 5.64m12.72 12.72A9 9 0 005.64 5.64m12.72 12.72L5.64 5.64" />
                      </svg>
                    </button>

                    {/* Supprimer */}
                    <button
                      onClick={() => setShowRemoveModal(true)}
                      className="w-full bg-white/[0.04] hover:bg-red-500/10 hover:border-red-500/20 border border-white/10 text-accent-red text-[12px] font-bold py-3 px-4 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Supprimer le profil</span>
                      <svg className="w-4 h-4 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Column 2 & 3 (spanning 2 columns on desktop): Info */}
          <div className="lg:col-span-2 space-y-6">

            {/* Tab Bar (Projet tab is Stagiaire-only — only stagiaires own projects) */}
            {isStagiaire ? (
              <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/10 rounded-xl w-fit">
                <button
                  onClick={() => setActiveProfileTab('info')}
                  className={`px-5 py-2 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                    activeProfileTab === 'info' ? 'bg-accent-blue text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Info
                </button>
                <button
                  onClick={() => setActiveProfileTab('projects')}
                  className={`px-5 py-2 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                    activeProfileTab === 'projects' ? 'bg-accent-blue text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Projet
                </button>
              </div>
            ) : null}

            {(!isStagiaire || activeProfileTab === 'info') && (
            <div className="section-card p-6">
              <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[2px] mb-4">Info</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Nom */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Nom</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm?.nom || ''}
                      onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                      className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50"
                    />
                  ) : (
                    <div className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] flex items-center">
                      {selectedUser.nom}
                    </div>
                  )}
                </div>

                {/* Prénom */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Prénom</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm?.prenom || ''}
                      onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                      className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50"
                    />
                  ) : (
                    <div className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] flex items-center">
                      {selectedUser.prenom}
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Email</span>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editForm?.email || ''}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50"
                    />
                  ) : (
                    <div className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] flex items-center break-all">
                      {selectedUser.email}
                    </div>
                  )}
                </div>

                {/* Téléphone */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Téléphone</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm?.tel || ''}
                      onChange={(e) => setEditForm({ ...editForm, tel: e.target.value })}
                      className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50"
                    />
                  ) : (
                    <div className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] flex items-center">
                      {selectedUser.tel}
                    </div>
                  )}
                </div>

                {/* CIN */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">CIN ID</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm?.cin || ''}
                      onChange={(e) => setEditForm({ ...editForm, cin: e.target.value })}
                      className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50 uppercase"
                    />
                  ) : (
                    <div className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] flex items-center uppercase">
                      {selectedUser.cin}
                    </div>
                  )}
                </div>

                {/* CEF (Stagiaire Only) */}
                {isStagiaire && (
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Code CEF</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm?.cef || ''}
                      onChange={(e) => setEditForm({ ...editForm, cef: e.target.value })}
                      className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50"
                    />
                  ) : (
                    <div className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] flex items-center">
                      {selectedUser.cef}
                    </div>
                  )}
                </div>
                )}

                {/* Pôle (Stagiaire Only) */}
                {isStagiaire && (isEditing ? editForm?.pole !== undefined : selectedUser.pole) && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Pôle</span>
                    {isEditing ? (
                      isStagiaire ? (
                        <select
                          value={editForm?.pole || ''}
                          onChange={(e) => updateEditForm('pole', e.target.value)}
                          className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50 cursor-pointer"
                        >
                          <option value="" disabled hidden>Sélectionner le pôle</option>
                          {poleOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={editForm?.pole || ''}
                          onChange={(e) => setEditForm({ ...editForm, pole: e.target.value })}
                          className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50"
                        />
                      )
                    ) : (
                      <div className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] flex items-center">
                        {selectedUser.pole}
                      </div>
                    )}
                  </div>
                )}

                {/* Niveau (Stagiaire Only) */}
                {isStagiaire && (isEditing ? editForm?.niveau !== undefined : selectedUser.niveau) && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Niveau</span>
                    {isEditing ? (
                      <select
                        value={editForm?.niveau || ''}
                        onChange={(e) => updateEditForm('niveau', e.target.value)}
                        className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50 cursor-pointer"
                      >
                        <option value="" disabled hidden>Sélectionner le niveau</option>
                        {niveauOptions.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
                      </select>
                    ) : (
                      <div className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] flex items-center">
                        {selectedUser.niveau}
                      </div>
                    )}
                  </div>
                )}

                {/* Filière (Stagiaire Only) */}
                {isStagiaire && (isEditing ? editForm?.filiere !== undefined : selectedUser.filiere) && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Filière</span>
                    {isEditing ? (
                      <select
                        value={editForm?.filiere || ''}
                        onChange={(e) => updateEditForm('filiere', e.target.value)}
                        className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50 cursor-pointer"
                      >
                        <option value="" disabled hidden>Sélectionner la filière</option>
                        {editFiliereList.map((f) => (
                          <option key={f.name} value={f.name}>{f.name === "N" ? "Aucune filière disponible" : f.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] flex items-center leading-snug">
                        {selectedUser.filiere}
                      </div>
                    )}
                  </div>
                )}

                {/* Année (Stagiaire Only) */}
                {isStagiaire && (isEditing ? editForm?.year !== undefined : selectedUser.year) && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Année</span>
                    {isEditing ? (
                      <select
                        value={editForm?.year || ''}
                        onChange={(e) => updateEditForm('year', e.target.value)}
                        className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50 cursor-pointer"
                      >
                        <option value="" disabled hidden>Sélectionner l'année</option>
                        {yearOptions.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
                      </select>
                    ) : (
                      <div className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] flex items-center">
                        {selectedUser.year}
                      </div>
                    )}
                  </div>
                )}

                {/* Option (Stagiaire Only, when available for the chosen filière/année) */}
                {isStagiaire && (isEditing ? editOptionList.length > 0 : selectedUser.option) && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-2 ml-1">Option</span>
                    {isEditing ? (
                      <select
                        value={editForm?.option || ''}
                        onChange={(e) => updateEditForm('option', e.target.value)}
                        className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] outline-none focus:border-accent-blue/50 cursor-pointer"
                      >
                        <option value="" disabled hidden>Sélectionner une option</option>
                        {editOptionList.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <div className="bg-white/[0.05] border border-white/10 text-white text-[13px] font-semibold rounded-lg px-4 py-3 min-h-[46px] flex items-center">
                        {selectedUser.option}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
            )}

            {/* Projets Tab (Stagiaire only) */}
            {isStagiaire && activeProfileTab === 'projects' && (
              <ProjectsPanel
                projects={selectedUser.projects}
                recycleBin={selectedUser.recycleBin || []}
                usersList={users}
                ownerId={selectedUser.id}
                onUpdateProjects={updateSelectedUserProjects}
                onUpdateRecycleBin={updateSelectedUserRecycleBin}
                onAddUser={addUser}
              />
            )}

          </div>

        </div>

        {/* Deactivate / Reactivate Confirmation Modal */}
        {showDeactivateModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-[#151b2e] border border-white/10 rounded-2xl shadow-2xl p-7 animate-in fade-in zoom-in-95 duration-200">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${selectedUser.isDeactivated ? 'bg-accent-green/10' : 'bg-accent-amber/10'}`}>
                <svg className={`w-6 h-6 ${selectedUser.isDeactivated ? 'text-accent-green' : 'text-accent-amber'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.36 18.36A9 9 0 015.64 5.64m12.72 12.72A9 9 0 005.64 5.64m12.72 12.72L5.64 5.64" />
                </svg>
              </div>
              <h3 className="text-[16px] font-bold text-white mb-2">
                {selectedUser.isDeactivated ? 'Réactiver ce profil ?' : 'Désactiver ce profil ?'}
              </h3>
              <p className="text-[13px] text-white/50 leading-relaxed mb-6">
                {selectedUser.isDeactivated
                  ? `${selectedUser.prenom} ${selectedUser.nom} retrouvera l'accès à son compte.`
                  : `${selectedUser.prenom} ${selectedUser.nom} n'aura plus accès à son compte tant qu'il ne sera pas réactivé.`}
              </p>
              <div className="flex flex-col space-y-2.5">
                <button
                  onClick={confirmToggleDeactivate}
                  className="w-full bg-accent-blue hover:bg-accent-blue/85 text-white text-[13px] font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Oui, {selectedUser.isDeactivated ? 'réactiver' : 'désactiver'}
                </button>
                <button
                  onClick={() => setShowDeactivateModal(false)}
                  className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[13px] font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Profile Confirmation Modal */}
        {showRemoveModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-[#151b2e] border border-white/10 rounded-2xl shadow-2xl p-7 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-accent-red/10">
                <svg className="w-6 h-6 text-accent-red" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-[16px] font-bold text-white mb-2">Supprimer ce profil ?</h3>
              <p className="text-[13px] text-white/50 leading-relaxed mb-6">
                {selectedUser.prenom} {selectedUser.nom} sera définitivement supprimé. Cette action est irréversible.
              </p>
              <div className="flex flex-col space-y-2.5">
                <button
                  onClick={confirmRemoveProfile}
                  className="w-full bg-accent-red hover:bg-accent-red/85 text-white text-[13px] font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Oui, supprimer
                </button>
                <button
                  onClick={() => setShowRemoveModal(false)}
                  className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-[13px] font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="relative">
      {/* Header */}
      <div className="mb-7 mt-2 flex items-center justify-between">
        <div>
          <p className="text-[12px] font-medium text-white/50 mb-1">Pages / Users</p>
          <h1 className="text-[32px] font-bold text-white tracking-tight">Utilisateurs</h1>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue hover:bg-accent-blue/85 text-white text-[13px] font-bold rounded-xl transition-colors cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          <span>Nouvel utilisateur</span>
        </button>
      </div>

      {showAddUser && (
        <AddUserModal
          onCreate={(newUser) => { addUser(newUser); setShowAddUser(false); }}
          onClose={() => setShowAddUser(false)}
        />
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-4 flex items-center text-white/30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher par nom, prénom ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1b254b]/50 border border-white/10 text-white placeholder-white/30 text-[13px] font-medium rounded-xl pl-11 pr-4 py-3 outline-none focus:border-accent-blue/50 transition-colors"
            />
          </div>

          {/* Role Filter */}
          <div className="w-full sm:w-48">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full bg-[#1b254b]/50 border border-white/10 text-white text-[13px] font-medium rounded-xl px-4 py-3 outline-none cursor-pointer focus:border-accent-blue/50 transition-colors"
            >
              <option value="All">Tous les rôles</option>
              <option value="Stagiaire">Stagiaire</option>
              <option value="Formateur">Formateur</option>
              <option value="Administrateur">Administrateur</option>
              <option value="Visiteur">Visiteur</option>
            </select>
          </div>
        </div>

        {/* Dynamic Column Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowColumnDropdown(!showColumnDropdown)}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-white/10 bg-[#1b254b]/50 text-[13px] text-white font-bold flex items-center justify-center space-x-2.5 hover:bg-[#1b254b]/80 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>Colonnes</span>
          </button>

          {showColumnDropdown && (
            <div className="absolute right-0 mt-2.5 w-52 bg-[#151b2e] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-3 duration-250">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[2px] mb-3">Afficher les champs</p>
              <div className="space-y-2.5">
                {ALL_COLUMNS.map((col) => (
                  <label key={col.id} className="flex items-center space-x-3 text-white/80 cursor-pointer select-none text-[13px] hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={visibleColumns[col.id]}
                      onChange={() => handleToggleColumn(col.id)}
                      className="w-4 h-4 rounded border-white/10 bg-body text-accent-blue focus:ring-accent-blue cursor-pointer"
                    />
                    <span className="font-semibold">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Users Dynamic Table */}
      <div className="section-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                {ALL_COLUMNS.map(
                  (col) =>
                    visibleColumns[col.id] && (
                      <th
                        key={col.id}
                        className="px-7 py-4 text-[9px] font-bold text-white/30 uppercase tracking-[2px]"
                      >
                        {col.label}
                      </th>
                    )
                )}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={ALL_COLUMNS.length} className="px-7 py-16 text-center text-white/20 italic text-[13px]">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => { setSelectedUser(user); setActiveProfileTab('info'); }}
                    className={`trow border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors ${
                      user.isDeactivated ? 'opacity-40' : ''
                    }`}
                  >
                    {visibleColumns.nom && (
                      <td className="px-7 py-4 text-[13px] font-bold text-white">{user.nom}</td>
                    )}
                    {visibleColumns.prenom && (
                      <td className="px-7 py-4 text-[13px] font-semibold text-white/80">{user.prenom}</td>
                    )}
                    {visibleColumns.role && (
                      <td className="px-7 py-4 text-[12px]">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider ${
                            user.isDeactivated
                              ? 'bg-accent-red/10 text-accent-red border border-accent-red/20'
                              : user.role === 'Stagiaire'
                              ? 'bg-accent-green/10 text-accent-green'
                              : user.role === 'Formateur'
                              ? 'bg-accent-blue/10 text-accent-blue'
                              : user.role === 'Administrateur'
                              ? 'bg-accent-purple/10 text-accent-purple'
                              : 'bg-accent-amber/10 text-accent-amber'
                          }`}
                        >
                          {user.isDeactivated ? 'Désactivé' : user.role}
                        </span>
                      </td>
                    )}
                    {visibleColumns.email && (
                      <td className="px-7 py-4 text-[13px] text-white/70">{user.email}</td>
                    )}
                    {visibleColumns.tel && (
                      <td className="px-7 py-4 text-[13px] text-white/70">{user.tel}</td>
                    )}
                    {visibleColumns.cin && (
                      <td className="px-7 py-4 text-[13px] text-white/70 uppercase">{user.cin}</td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
