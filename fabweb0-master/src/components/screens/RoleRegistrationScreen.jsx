import { useState } from 'react';
import { useApp, SCREENS } from '../../context/AppContext';
import { validateEmail, validatePhone } from '../../utils/validation';
import { ensureUserIdentity } from '../../utils/userIdentity';

export default function RoleRegistrationScreen() {
  const { navigateTo, pendingRole, goToCharte, setCurrentUser, showLogin, registrationDraft, setRegistrationDraft, showNotification } = useApp();

  const isDraftValid = registrationDraft && registrationDraft.role === 'other';
  const [form, setForm] = useState(isDraftValid ? registrationDraft.form : { prenom: '', nom: '', cin: '', tel: '', email: '' });
  const [charteAccepted, setCharteAccepted] = useState(isDraftValid ? registrationDraft.charteAccepted : false);
  const [reproductionAccepted, setReproductionAccepted] = useState(isDraftValid ? registrationDraft.reproductionAccepted : false);

  const handleCharteClick = (e) => {
    e.preventDefault();
    setRegistrationDraft({ role: 'other', form, charteAccepted, reproductionAccepted });
    goToCharte(SCREENS.ROLE_REGISTRATION);
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    const { prenom, nom, cin, tel, email } = form;
    if (!prenom || !nom || !cin || !tel || !email || !charteAccepted) {
      showNotification("Veuillez remplir tous les champs et accepter la charte.", 'error');
      return;
    }
    if (!validateEmail(email)) {
      showNotification("Veuillez entrer une adresse email valide.", 'error');
      return;
    }
    if (!validatePhone(tel)) {
      showNotification("Le numéro de téléphone doit commencer par 06 ou 07 et contenir 10 chiffres au total.", 'error');
      return;
    }
    setCurrentUser(ensureUserIdentity({ ...form, role: (pendingRole || 'visiteur').toLowerCase() }));
    showLogin();
  };

  const titleClass = pendingRole === 'Administrateur'
    ? "text-xl sm:text-2xl font-bold text-t-primary tracking-tight leading-none"
    : "text-2xl font-bold text-t-primary";

  return (
    <div className="flex flex-col w-full h-full max-w-md mx-auto p-6 justify-between overflow-hidden">
      <div className="flex items-center justify-center relative mb-0">
        <button onClick={() => navigateTo(SCREENS.ROLE_SELECTION)} className="absolute left-0 p-2 text-t-primary/40 hover:text-t-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className={titleClass}>Welcome {pendingRole}</h2>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-2 custom-scrollbar my-4">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-t-primary px-1">Prenom</label>
          <input type="text" placeholder="Entrez Votre Prenom" value={form.prenom} onChange={e => update('prenom', e.target.value)}
            className="w-full p-4 bg-t-surface border border-gray-300 rounded-xl outline-none focus:border-midnight-blue focus:ring-1 focus:ring-midnight-blue transition-all" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-t-primary px-1">Nom</label>
          <input type="text" placeholder="Entrez Votre Nom" value={form.nom} onChange={e => update('nom', e.target.value)}
            className="w-full p-4 bg-t-surface border border-gray-300 rounded-xl outline-none focus:border-midnight-blue focus:ring-1 focus:ring-midnight-blue transition-all" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-t-primary px-1">ID CIN</label>
          <input type="text" placeholder="Entrez Votre CIN" value={form.cin} onChange={e => update('cin', e.target.value)}
            className="w-full p-4 bg-t-surface border border-gray-300 rounded-xl outline-none focus:border-midnight-blue focus:ring-1 focus:ring-midnight-blue transition-all" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-t-primary px-1">téléphone</label>
          <input type="tel" maxLength="10" placeholder="Entrez Votre Tel" value={form.tel} onChange={e => update('tel', e.target.value)}
            className="w-full p-4 bg-t-surface border border-gray-300 rounded-xl outline-none focus:border-midnight-blue focus:ring-1 focus:ring-midnight-blue transition-all" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-t-primary px-1">Email</label>
          <input type="email" placeholder="Entrez Votre Email" value={form.email} onChange={e => update('email', e.target.value)}
            className="w-full p-4 bg-t-surface border border-gray-300 rounded-xl outline-none focus:border-midnight-blue focus:ring-1 focus:ring-midnight-blue transition-all" />
        </div>

        <div className="flex items-start space-x-3 pt-4">
          <input type="checkbox" checked={charteAccepted} onChange={e => setCharteAccepted(e.target.checked)}
            className="mt-1 w-5 h-5 shrink-0 rounded border-gray-300 text-t-primary focus:ring-midnight-blue cursor-pointer" />
          <p className="text-[13px] text-t-primary leading-relaxed">
            J'accepte de respecter <button onClick={handleCharteClick} className="text-[#3B5FE6] underline font-semibold cursor-pointer">la charte de fab lab</button>
          </p>
        </div>
        <div className="flex items-start space-x-3 pt-2">
          <input type="checkbox" checked={reproductionAccepted} onChange={e => setReproductionAccepted(e.target.checked)}
            className="mt-1 w-5 h-5 shrink-0 rounded border-gray-300 text-t-primary focus:ring-midnight-blue cursor-pointer" />
          <p className="text-[13px] text-t-primary leading-relaxed">
            J'Autorise la reproduction sur tout support et par tous procédés et à diffuser, à titre gratuit et non exclusif, la (ou les) photographie(s) me représentant ainsi que mon témoignage recueillis
          </p>
        </div>
      </div>

      <div className="pt-4 text-center">
        <button onClick={handleSubmit}
          className="w-full py-4 bg-button-gradient text-white font-bold text-lg rounded-xl shadow-[0_8px_20px_-5px_rgba(26,102,255,0.4)] hover:shadow-[0_12px_25px_-5px_rgba(26,102,255,0.5)] hover:-translate-y-1 transition-all duration-300 active:scale-95">
          créer un compte <span className="ml-2">→</span>
        </button>
      </div>
    </div>
  );
}
