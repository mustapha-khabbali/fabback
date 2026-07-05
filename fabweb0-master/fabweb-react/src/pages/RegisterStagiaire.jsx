import React from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';

const RegisterStagiaire = () => {
  const navigate = useNavigate();

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
        <h2 className="text-2xl font-bold text-midnight-blue">Welcome Stagiaire</h2>
      </div>

      <div className="space-y-3 overflow-y-auto flex-1 px-2 custom-scrollbar pb-6">
         <Input label="Prénom" placeholder="Entrez Votre Prénom" />
         <Input label="Nom" placeholder="Entrez Votre Nom" />
         <Input label="ID CIN" placeholder="Entrez Votre CIN" />
         
         <Select label="POLE" options={['digital et intelligence artificiel', 'Agriculture', 'BTP']} />
         <Select label="Niveau" options={['Technicien Spécialisé', 'Technicien', 'Qualification']} />
      </div>

      <div className="pt-2 shrink-0 text-center pb-4">
        <Button fullWidth variant="primary" onClick={() => alert('Account created!')}>
          Créer un compte <span className="ml-2">→</span>
        </Button>
      </div>
    </div>
  );
};

export default RegisterStagiaire;
