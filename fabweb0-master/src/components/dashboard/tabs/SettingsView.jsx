import { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';

export default function SettingsView({ onBack }) {
  const { 
    theme, setTheme, 
    contactPrivacyMode, setContactPrivacyMode, 
    allowedContactUsers, setAllowedContactUsers,
    language, setLanguage,
    setSelectedUser, setNavigationHistory, usersList
  } = useApp();
  const [activeSubView, setActiveSubView] = useState('main'); // 'main', 'appearance', 'privacy', 'language', 'personalise'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('ALL');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    return (usersList || []).filter(user => {
      const matchesSearch =
        `${user.prenom} ${user.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = searchFilter === 'ALL' || user.role.toUpperCase() === searchFilter.toUpperCase();
      return matchesSearch && matchesRole;
    });
  }, [searchQuery, searchFilter, usersList]);

  const toggleUserInAllowedList = (userId) => {
    if (allowedContactUsers.includes(userId)) {
      setAllowedContactUsers(allowedContactUsers.filter(id => id !== userId));
    } else {
      setAllowedContactUsers([...allowedContactUsers, userId]);
    }
  };

  const viewUserProfile = (user) => {
    setNavigationHistory([{ selectedUser: null, currentProjectId: null, fromTab: null }]);
    setSelectedUser(user);
    // activeTab is already PROFILE (SettingsView is inside MyProfileTab), no need to set it
  };

  const roles = [
    { id: 'ALL', label: 'Tous les rôles', icon: '👥' },
    { id: 'STAGIAIRE', label: 'Stagiaires', icon: '🎓' },
    { id: 'FORMATEUR', label: 'Formateurs', icon: '👨‍🏫' },
    { id: 'ADMINISTRATEUR', label: 'Administrateurs', icon: '🛡️' },
    { id: 'VISITEUR', label: 'Visiteurs', icon: '👤' }
  ];

  const MenuItem = ({ icon, title, description, onClick }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center p-5 hover:bg-t-surface-alt active:bg-t-surface-hover transition-colors border-b border-t-border group"
    >
      <div className="w-10 h-10 flex items-center justify-center text-t-secondary group-hover:text-t-primary transition-colors">
        {icon}
      </div>
      <div className="flex-1 text-left ml-4">
        <h4 className="text-sm font-bold text-t-primary">{title}</h4>
        {description && <p className="text-[11px] text-t-tertiary mt-0.5">{description}</p>}
      </div>
      <div className="text-t-muted group-hover:text-t-tertiary transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    </button>
  );

  const SubViewHeader = ({ title, onBack }) => (
    <div className="sticky top-0 z-20 bg-t-surface-glass backdrop-blur-xl pt-12 pb-4 px-6 shrink-0 border-b border-t-border flex items-center space-x-6">
      <button
        onClick={onBack}
        className="p-2 -ml-2 text-t-primary hover:bg-t-surface-alt rounded-full transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
      </button>
      <h2 className="text-xl font-bold text-t-primary tracking-tight">{title}</h2>
    </div>
  );

  const renderMainView = () => (
    <div className="flex flex-col h-full bg-t-body">
      <div className="pt-12 pb-6 px-6 border-b border-t-border">
        <div className="flex items-center space-x-6 mb-8">
           <button onClick={onBack} className="p-2 -ml-2 hover:bg-t-surface-alt rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-t-primary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
           </button>
           <h2 className="text-xl font-black text-t-primary uppercase">Paramètres</h2>
        </div>
        <p className="text-[13px] text-t-tertiary font-medium">Gérez votre expérience, vos thèmes et la confidentialité de vos données.</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <MenuItem 
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>}
          title="Apparence"
          description="Gérez vos thèmes et le mode d'affichage."
          onClick={() => setActiveSubView('appearance')}
        />
        <MenuItem 
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
          title="Confidentialité et sécurité"
          description="Contrôlez les informations que vous partagez."
          onClick={() => setActiveSubView('privacy')}
        />
        <MenuItem 
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 0h7M11 21l5-10 5 10M12.751 5C11.783 11.37 9.198 15.299 6 18" /></svg>}
          title="Langues"
          description="Choisissez la langue de l'interface."
          onClick={() => setActiveSubView('language')}
        />
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className="flex flex-col h-full bg-t-body animate-in slide-in-from-right duration-200">
      <SubViewHeader title="Apparence" onBack={() => setActiveSubView('main')} />
      <div className="p-6 space-y-8">
        <div className="space-y-4">
          <h3 className="text-[13px] font-black text-t-tertiary uppercase tracking-widest px-1">Thème</h3>
          <div className="space-y-3">
            {[
              { id: 'light', label: 'Mode Clair', icon: '☀️', desc: 'Interface claire et lumineuse' },
              { id: 'dark', label: 'Mode Sombre', icon: '🌙', desc: 'Interface sombre premium' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all active:scale-[0.98] glass-card glow-on-hover ${
                  theme === t.id
                    ? 'border-[#0075FF] gradient-border-selected'
                    : 'border-t-border bg-t-surface'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                    t.id === 'dark' ? 'bg-[#060B28]' : 'bg-amber-50'
                  }`}>
                    {t.icon}
                  </div>
                  <div className="text-left">
                    <span className={`font-bold block ${theme === t.id ? 'text-[#0075FF]' : 'text-t-primary'}`}>{t.label}</span>
                    <span className="text-[11px] text-t-tertiary">{t.desc}</span>
                  </div>
                </div>
                {theme === t.id && (
                  <div className="w-6 h-6 bg-gradient-to-br from-[#0075FF] to-[#4318FF] rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="flex flex-col h-full bg-t-body animate-in slide-in-from-right duration-200">
      <SubViewHeader title="Confidentialité" onBack={() => setActiveSubView('main')} />
      <div className="p-6 space-y-8">
        <div className="space-y-4">
          <h3 className="text-[13px] font-black text-t-tertiary uppercase tracking-widest px-1">Visibilité des contacts</h3>
          <p className="text-xs text-t-tertiary px-1 leading-relaxed">Choisissez qui peut voir votre adresse email et votre numéro de téléphone.</p>
          <div className="space-y-2">
            {[
              { id: 'private', label: 'Privé', description: 'Personne ne peut voir vos contacts.' },
              { id: 'public', label: 'Public', description: 'Tous les membres peuvent voir vos contacts.' },
              { id: 'personalised', label: 'Personnalisé', description: 'Choisissez spécifiquement qui peut voir vos contacts.' }
            ].map(opt => (
              <div key={opt.id} className="space-y-2">
                <button
                  onClick={() => setContactPrivacyMode(opt.id)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all active:scale-[0.98] glass-card ${
                    contactPrivacyMode === opt.id
                      ? 'border-[#0075FF] gradient-border-selected'
                      : 'border-t-border bg-t-surface'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold ${contactPrivacyMode === opt.id ? 'text-[#0075FF]' : 'text-t-primary'}`}>{opt.label}</span>
                    {contactPrivacyMode === opt.id && (
                      <div className="w-5 h-5 bg-gradient-to-br from-[#0075FF] to-[#4318FF] rounded-full flex items-center justify-center">
                        <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-t-tertiary">{opt.description}</p>
                </button>
                {opt.id === 'personalised' && contactPrivacyMode === 'personalised' && (
                  <button 
                    onClick={() => setActiveSubView('personalise')}
                    className="w-full flex items-center justify-between p-4 bg-t-surface border border-[#0075FF]/20 rounded-2xl text-[#0075FF] font-bold text-xs animate-in slide-in-from-top-2 glass-card"
                  >
                    <span>Gérer la liste ({allowedContactUsers.length})</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPersonalise = () => (
    <div className="flex flex-col h-full bg-t-body animate-in slide-in-from-right duration-200 relative">
      <SubViewHeader title="Personnaliser" onBack={() => setActiveSubView('privacy')} />
      
      {/* Search and Filter Row */}
      <div className="px-6 pt-6 space-y-4 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative flex items-center bg-t-surface-alt glass-card rounded-[24px] border border-t-border overflow-hidden focus-within:ring-2 focus-within:ring-[#0075FF]/20 transition-all">
            <svg className="absolute left-5 h-5 w-5 text-t-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 py-4 pl-14 pr-4 text-sm font-bold text-t-primary outline-none bg-transparent placeholder:text-t-muted"
            />
          </div>
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
              searchFilter !== 'ALL' ? 'bg-[#0075FF] text-white shadow-lg shadow-blue-500/20' : 'bg-t-surface-alt text-t-muted border border-t-border glass-card'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>
        
        {searchFilter !== 'ALL' && (
          <div className="flex animate-fade-in">
             <div className="bg-blue-100 text-[#0075FF] px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center space-x-2">
                <span>Rôle: {searchFilter}</span>
                <button onClick={() => setSearchFilter('ALL')}>
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar">
        {filteredUsers.length > 0 ? (
          filteredUsers.map(user => {
            const isAllowed = allowedContactUsers.includes(user.id);
            return (
              <div
                key={user.id}
                className={`w-full flex items-center p-4 rounded-3xl border-2 transition-all group glass-card ${
                  isAllowed ? 'gradient-border-selected border-[#0075FF]/30' : 'bg-t-surface border-t-border'
                }`}
              >
                {/* Profile Clickable Area */}
                <div 
                  onClick={() => viewUserProfile(user)}
                  className="flex flex-1 items-center cursor-pointer active:scale-[0.98] transition-all"
                >
                  <div className="w-12 h-12 bg-t-surface-alt rounded-2xl flex items-center justify-center text-sm font-black text-[#0075FF] border border-t-border overflow-hidden">
                     {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <span>{user.prenom[0]}{user.nom[0]}</span>}
                  </div>
                  <div className="flex-1 text-left ml-4">
                    <h4 className="text-sm font-bold text-t-primary group-hover:text-[#0075FF] transition-colors">{user.prenom} {user.nom}</h4>
                    <p className="text-[10px] text-t-tertiary font-bold uppercase tracking-widest">{user.role}</p>
                  </div>
                </div>

                {/* Permission Toggle Area */}
                <button 
                  onClick={() => toggleUserInAllowedList(user.id)}
                  className={`ml-4 w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all active:scale-90 ${
                    isAllowed ? 'bg-gradient-to-br from-[#0075FF] to-[#4318FF] border-[#0075FF] shadow-lg shadow-blue-500/20' : 'border-t-border-strong bg-t-surface'
                  }`}
                >
                  {isAllowed ? (
                    <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-t-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center opacity-20">
            <p className="font-bold text-t-primary">Aucun membre trouvé</p>
          </div>
        )}
      </div>

      {/* Filter Bottom Sheet Menu */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-[100] animate-fade-in">
          <div className="absolute inset-0 bg-t-overlay backdrop-blur-sm" onClick={() => setIsFilterModalOpen(false)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-t-modal-bg glass-card rounded-t-[40px] p-8 animate-slide-up shadow-2xl border-t border-t-border-strong">
            <div className="w-12 h-1.5 bg-t-modal-handle rounded-full mx-auto mb-8"></div>
            <h3 className="text-xl font-black text-t-primary mb-8">Filtrer par rôle</h3>
            <div className="space-y-3">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => {
                    setSearchFilter(role.id);
                    setIsFilterModalOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all ${searchFilter === role.id
                    ? 'gradient-border-selected text-[#0075FF] border-2 border-[#0075FF]/20'
                    : 'bg-t-surface-alt text-t-secondary border-2 border-transparent'
                    }`}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{role.icon}</span>
                    <span className="font-bold text-[15px]">{role.label}</span>
                  </div>
                  {searchFilter === role.id && (
                    <svg className="h-5 w-5 text-[#0075FF]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsFilterModalOpen(false)}
              className="w-full mt-8 py-4 bg-t-primary text-t-inverse font-bold rounded-2xl"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderLanguage = () => (
    <div className="flex flex-col h-full bg-t-body animate-in slide-in-from-right duration-200">
      <SubViewHeader title="Langues" onBack={() => setActiveSubView('main')} />
      <div className="p-6 space-y-4">
        <h3 className="text-[13px] font-black text-t-tertiary uppercase tracking-widest px-1">Langue de l'interface</h3>
        <div className="space-y-2">
          {[
            { id: 'arabic', label: 'العربية' },
            { id: 'french', label: 'Français' },
            { id: 'english', label: 'English' }
          ].map(l => (
            <button
              key={l.id}
              onClick={() => setLanguage(l.id)}
              className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all active:scale-[0.98] glass-card ${
                language === l.id
                  ? 'border-[#0075FF] gradient-border-selected'
                  : 'border-t-border bg-t-surface'
              }`}
            >
              <span className={`font-bold ${language === l.id ? 'text-[#0075FF]' : 'text-t-primary'}`}>{l.label}</span>
              {language === l.id && (
                <div className="w-5 h-5 bg-gradient-to-br from-[#0075FF] to-[#4318FF] rounded-full flex items-center justify-center">
                  <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  switch (activeSubView) {
    case 'appearance': return renderAppearance();
    case 'privacy': return renderPrivacy();
    case 'language': return renderLanguage();
    case 'personalise': return renderPersonalise();
    default: return renderMainView();
  }
}
