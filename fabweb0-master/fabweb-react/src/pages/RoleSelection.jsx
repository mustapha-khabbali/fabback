import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

const RoleSelection = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    // In a real app we'd save this to context or local storage
    sessionStorage.setItem('pending_role', role);
    if (role === 'Stagiaire') {
      navigate('/register-stagiaire');
    } else {
      navigate(`/register-role?role=${role}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-sm md:max-w-md mx-auto space-y-8 p-6">
      
      <h2 className="text-2xl sm:text-3xl font-semibold text-midnight-blue mb-4">
        Hi there are you?
      </h2>

      <div className="flex flex-col space-y-4 w-full px-6">
        {['Stagiaire', 'Formateur', 'Administrateur', 'Visiteur'].map((role) => (
          <Button 
            key={role}
            fullWidth 
            variant="secondary"
            onClick={() => handleRoleSelect(role)}
          >
            {role}
          </Button>
        ))}
      </div>

      <button 
        onClick={() => navigate('/')}
        className="pt-8 text-midnight-blue/60 font-medium hover:text-midnight-blue transition-colors"
      >
        &larr; Back to Home
      </button>
    </div>
  );
};

export default RoleSelection;
