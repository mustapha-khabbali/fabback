import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const RegisterRole = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || sessionStorage.getItem('pending_role') || 'Visiteur';

  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    cin: '',
    tel: '',
    email: '',
    charteAccepted: false,
    reproductionAccepted: false
  });

  const handleSubmit = () => {
    if (!formData.prenom || !formData.nom || !formData.cin || !formData.tel || !formData.email || !formData.charteAccepted) {
      alert("Veuillez remplir tous les champs et accepter la charte.");
      return;
    }
    alert("Account created successfully!");
    // navigate('/dashboard');
  };

  const getTitleClasses = () => {
    if (role === 'Administrateur') {
      return "text-xl sm:text-2xl font-bold text-midnight-blue tracking-tight leading-none";
    }
    return "text-2xl font-bold text-midnight-blue";
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-6 space-y-6 h-screen">
      
      {/* Header */}
      <div className="flex items-center justify-center relative mb-0 shrink-0">
        <button 
          onClick={() => navigate('/role-selection')}
          className="absolute left-0 p-2 text-midnight-blue/40 hover:text-midnight-blue transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className={getTitleClasses()}>Welcome {role}</h2>
      </div>

      {/* Form Fields */}
      <div className="space-y-3 overflow-y-auto flex-1 px-2 custom-scrollbar pb-6">
        <Input 
          label="Prenom" 
          placeholder="Entrez Votre Prenom"
          value={formData.prenom}
          onChange={(e) => setFormData({...formData, prenom: e.target.value})}
        />
        <Input 
          label="Nom" 
          placeholder="Entrez Votre Nom"
          value={formData.nom}
          onChange={(e) => setFormData({...formData, nom: e.target.value})}
        />
        <Input 
          label="ID CIN" 
          placeholder="Entrez Votre CIN"
          value={formData.cin}
          onChange={(e) => setFormData({...formData, cin: e.target.value})}
        />
        <Input 
          label="Téléphone" 
          type="tel"
          placeholder="Entrez Votre Tel"
          value={formData.tel}
          onChange={(e) => setFormData({...formData, tel: e.target.value})}
        />
        <Input 
          label="Email" 
          type="email"
          placeholder="Entrez Votre Email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
        />

        {/* Checkboxes */}
        <div className="flex items-start space-x-3 pt-4">
          <input 
            type="checkbox"
            checked={formData.charteAccepted}
            onChange={(e) => setFormData({...formData, charteAccepted: e.target.checked})}
            className="mt-1 w-5 h-5 flex-shrink-0 rounded border-gray-300 text-midnight-blue focus:ring-midnight-blue cursor-pointer"
          />
          <p className="text-[13px] text-midnight-blue leading-relaxed">
            J'accepte de respecter <button className="text-[#3B5FE6] underline font-semibold cursor-pointer">la charte de fab lab</button>
          </p>
        </div>
        
        <div className="flex items-start space-x-3 pt-2">
          <input 
            type="checkbox"
            checked={formData.reproductionAccepted}
            onChange={(e) => setFormData({...formData, reproductionAccepted: e.target.checked})}
            className="mt-1 w-5 h-5 flex-shrink-0 rounded border-gray-300 text-midnight-blue focus:ring-midnight-blue cursor-pointer"
          />
          <p className="text-[13px] text-midnight-blue leading-relaxed">
            J'Autorise la reproduction sur tout support et par tous procédés et à diffuser, à titre gratuit et non exclusif, la (ou les) photographie(s) me représentant ainsi que mon témoignage recueillis
          </p>
        </div>
      </div>

      <div className="pt-2 shrink-0 text-center pb-4">
        <Button fullWidth variant="primary" onClick={handleSubmit}>
          Créer un compte <span className="ml-2">→</span>
        </Button>
      </div>

    </div>
  );
};

export default RegisterRole;
