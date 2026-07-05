import { useState, useMemo } from 'react';
import { useApp, TABS } from '../../../context/AppContext';

export default function SearchTab() {
  const {
    setSelectedUser,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    searchFilter,
    setSearchFilter,
    usersList
  } = useApp();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    return usersList.filter(user => {
      const matchesSearch =
        `${user.prenom} ${user.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.cin?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = searchFilter === 'ALL' || user.role.toUpperCase() === searchFilter.toUpperCase();

      return matchesSearch && matchesRole;
    });
  }, [searchQuery, searchFilter, usersList]);

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setActiveTab(TABS.PROFILE);
  };

  const getRoleBadgeClass = (role) => {
    switch (role?.toLowerCase()) {
      case 'stagiaire': return 'bg-blue-100 text-blue-600';
      case 'formateur': return 'bg-purple-100 text-purple-600';
      case 'administrateur': return 'bg-amber-100 text-amber-600';
      case 'visiteur': return 'bg-t-surface-input text-gray-500';
      default: return 'bg-blue-50 text-blue-400';
    }
  };

  const roles = [
    { id: 'ALL', label: 'Tous les rôles', icon: '👥' },
    { id: 'STAGIAIRE', label: 'Stagiaires', icon: '🎓' },
    { id: 'FORMATEUR', label: 'Formateurs', icon: '👨‍🏫' },
    { id: 'ADMINISTRATEUR', label: 'Administrateurs', icon: '🛡️' },
    { id: 'VISITEUR', label: 'Visiteurs', icon: '👤' }
  ];

  return (
    <div className="flex flex-col h-full pt-12 pb-24 overflow-hidden relative">
      {/* Search Input Area (Clean, No Header) */}
      <div className="px-6 space-y-6 mb-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab(TABS.FABLAB)}
            className="p-3 bg-t-surface glass-card rounded-2xl text-t-tertiary shadow-sm active:scale-90 transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="relative flex-1 flex items-center bg-t-surface glass-card rounded-[24px] shadow-xl shadow-blue-900/5 border border-t-border-subtle overflow-hidden transition-all focus-within:ring-2 focus-within:ring-[#3B5FE6]/20">
            <input
              type="text"
              placeholder="Nom, Email, CIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 py-4 pl-3 pr-0 text-[13px] font-bold text-t-primary outline-none placeholder:text-t-muted"
            />
            <div className="flex items-center pr-4 space-x-0">
              <button
                onClick={() => setIsFilterOpen(true)}
                className={`p-3 transition-colors ${searchFilter !== 'ALL' ? 'text-[#3B5FE6]' : 'text-t-muted'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              <button
                className="w-10 h-10 bg-[#3B5FE6] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {searchFilter !== 'ALL' && (
          <div className="flex animate-fade-in">
            <div className="bg-blue-100 text-[#3B5FE6] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
              <span>Filtre: {searchFilter}</span>
              <button onClick={() => setSearchFilter('ALL')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto px-6 space-y-4 custom-scrollbar">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => handleUserClick(user)}
              className="bg-t-surface glass-card p-5 rounded-[32px] shadow-sm border border-white hover:border-[#3B5FE6]/30 transition-all active:scale-[0.98] group flex items-center space-x-4 cursor-pointer"
            >
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-lg font-black text-[#3B5FE6] border-2 border-white shadow-inner group-hover:bg-[#3B5FE6] group-hover:text-white transition-all">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <span>{(user.prenom?.[0] || '') + (user.nom?.[0] || '')}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-t-primary truncate pr-2">{user.prenom} {user.nom}</h3>
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${getRoleBadgeClass(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                {/* Email hidden for privacy */}
                <div className="flex items-center space-x-3 mt-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                    <span className="text-[9px] font-bold text-t-muted uppercase tracking-tighter">{user.points || 0} pts</span>
                  </div>
                  {user.filiere && (
                    <div className="flex items-center space-x-1">
                      <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                      <span className="text-[9px] font-bold text-t-muted uppercase tracking-tighter truncate max-w-[80px]">{user.filiere}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-t-primary/10 group-hover:text-[#3B5FE6] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-t-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-t-tertiary font-bold">Aucun utilisateur trouvé</p>
              <p className="text-xs text-t-muted">Essayez une autre recherche ou changez le filtre.</p>
            </div>
          </div>
        )}
      </div>

      {/* Filter Modal (YouTube Style Bottom Sheet) */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[100] animate-fade-in">
          <div
            className="absolute inset-0 bg-midnight-blue/60 backdrop-blur-sm"
            onClick={() => setIsFilterOpen(false)}
          ></div>
          <div className="absolute bottom-0 left-0 right-0 bg-t-surface glass-card rounded-t-[40px] p-8 animate-slide-up shadow-2xl">
            <div className="w-12 h-1.5 bg-t-surface-input rounded-full mx-auto mb-8"></div>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-t-primary">Filtrer par rôle</h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-2 bg-t-surface-alt rounded-full text-t-tertiary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => {
                    setSearchFilter(role.id);
                    setIsFilterOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all ${searchFilter === role.id
                    ? 'bg-blue-50 text-[#3B5FE6] border-2 border-[#3B5FE6]/20'
                    : 'bg-t-surface-alt text-t-secondary border-2 border-transparent'
                    }`}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{role.icon}</span>
                    <span className="font-bold text-[15px]">{role.label}</span>
                  </div>
                  {searchFilter === role.id && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-8 pb-4">
              <button
                onClick={() => setIsFilterOpen(false)}
                className="w-full py-4 bg-midnight-blue text-white font-bold rounded-2xl active:scale-95 transition-all shadow-xl shadow-midnight-blue/20"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
