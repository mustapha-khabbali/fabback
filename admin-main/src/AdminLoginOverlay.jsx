import { useState } from 'react';

export default function AdminLoginOverlay({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showError, setShowError] = useState(false);

  const handleLogin = () => {
    // Placeholder check — no backend wired up yet.
    if (username.trim() && password.trim()) {
      onLogin();
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  return (
    <div id="admin-login-overlay">
      <div className="login-card animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-accent-brand to-accent-purple shadow-lg mb-4 p-2">
            <img src="/fablab.webp" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Espace Admin</h2>
          <p className="text-white/40 text-xs mt-1 uppercase tracking-widest">Identification requise</p>
        </div>

        <div className="text-left">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1 mb-2 block">Identifiant</label>
          <input
            type="text"
            className="login-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1 mb-2 block">Mot de passe</label>
          <input
            type="password"
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button onClick={handleLogin} className="login-btn mt-4">Se connecter</button>
        <p
          className="text-accent-red text-[11px] font-bold mt-4 transition-opacity"
          style={{ opacity: showError ? 1 : 0 }}
        >
          Identifiants incorrects
        </p>
      </div>
    </div>
  );
}
