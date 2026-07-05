import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  const handleAuth = (provider) => {
    console.log(`Simulating ${provider} Auth`);
    // Simulating auth delay
    setTimeout(() => {
      navigate('/role-selection');
    }, 800);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full transition-all duration-500 p-4 md:p-12">
      <div className="w-full max-w-[340px] sm:max-w-[400px] md:max-w-[450px] flex flex-col items-center space-y-0">
        
        <div className="flex-shrink-0 mt-[-2rem] md:mt-0 w-[110px] md:w-[140px]">
          <img src="/youth.webp" alt="Youth 5.0 Logo" className="w-full h-auto object-contain" />
        </div>

        <div className="w-full drop-shadow-2xl mt-[4vh] md:mt-0">
          <img src="/intro.webp" alt="Innovation Illustration" className="w-full h-auto object-contain" />
        </div>

        <div className="text-center pt-2">
          <h1 className="text-2xl sm:text-3xl font-semibold text-midnight-blue leading-tight tracking-tight">
            From Imagination <br /> to Prototype.
          </h1>
        </div>

        <div className="w-full flex flex-col space-y-4 pt-4">
          <button 
            onClick={() => handleAuth('Google')}
            className="w-full py-4 bg-white text-midnight-blue font-bold text-lg rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center space-x-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            <span>Continuer avec Google</span>
          </button>

          <button 
            onClick={() => handleAuth('Outlook')}
            className="w-full py-4 bg-white text-midnight-blue font-bold text-lg rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center space-x-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/microsoft.svg" className="w-6 h-6" alt="Microsoft" />
            <span>Continuer avec Outlook</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default Home;
