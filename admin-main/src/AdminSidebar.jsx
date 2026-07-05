export const ADMIN_VIEWS = {
  DASHBOARD: 'dashboard',
  QR: 'qr',
  PV: 'pv',
  USERS: 'users',
  ANALYSE: 'analyse',
};

const NAV_ITEMS = [
  {
    id: ADMIN_VIEWS.DASHBOARD,
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: ADMIN_VIEWS.QR,
    label: 'QR Codes',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
  },
  {
    id: ADMIN_VIEWS.PV,
    label: 'PV',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: ADMIN_VIEWS.USERS,
    label: 'Users',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    ),
  },
];

export default function AdminSidebar({ activeView, onSelectView, onLogout }) {
  return (
    <aside className="sidebar w-[275px] flex flex-col shrink-0 z-50 px-4 py-8 relative">
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-[#0075FF] rounded-full blur-[100px] opacity-30 pointer-events-none" />

      <a href="/" className="px-4 pb-8 flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer block">
        <div className="w-[42px] h-[42px] rounded-lg flex items-center justify-center bg-gradient-to-br from-accent-brand to-accent-purple shadow-[0_4px_10px_rgba(0,117,255,0.4)] p-[5px]">
          <img src="/fablab.webp" alt="FabLab Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col justify-center translate-y-0.5">
          <h1 className="text-[18px] font-bold text-white tracking-[2.6px] uppercase leading-none font-recta">FAB LAB</h1>
          <p className="text-[8px] font-medium text-white/50 mb-1 mt-1 uppercase tracking-widest font-recta">cmc bmk</p>
        </div>
      </a>

      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />

      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectView(item.id)}
            className={`nav-item w-full flex items-center space-x-4 px-4 py-3 text-left ${activeView === item.id ? 'active' : ''}`}
          >
            <div className="icon-box">{item.icon}</div>
            <span className={`nav-label font-medium text-[13px] ${activeView === item.id ? 'text-white' : 'text-white/50'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-8">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-[12px] uppercase tracking-widest transition-all duration-150 ease-out active:scale-95 bg-accent-red/10 text-accent-red border border-transparent hover:border-accent-red/30 hover:bg-accent-red/20 cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
