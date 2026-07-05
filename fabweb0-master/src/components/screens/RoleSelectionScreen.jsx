import { useApp, SCREENS } from '../../context/AppContext';

export default function RoleSelectionScreen() {
  const { navigateTo, setPendingRole } = useApp();

  const handleRole = (role) => {
    if (role === 'Stagiaire') {
      navigateTo(SCREENS.STAGIAIRE);
    } else {
      setPendingRole(role);
      navigateTo(SCREENS.ROLE_REGISTRATION);
    }
  };

  return (
    <div className="flex flex-col items-center text-center w-full max-w-sm md:max-w-md space-y-8">
      <h2 className="text-2xl sm:text-3xl font-semibold text-t-primary mb-4">
        Hi there are you?
      </h2>

      <div className="flex flex-col space-y-4 w-full px-6 overflow-y-scroll max-h-[60vh] always-visible-scrollbar pr-2">
        {['Stagiaire', 'Formateur', 'Administrateur', 'Visiteur'].map((role) => (
          <button
            key={role}
            onClick={() => handleRole(role)}
            className="w-full py-4 bg-midnight-blue text-white font-bold text-lg rounded-xl shadow-lg hover:brightness-110 hover:-translate-y-1 transition-all duration-300 active:scale-95"
          >
            {role}
          </button>
        ))}
      </div>

      <button
        onClick={() => navigateTo(SCREENS.HOME)}
        className="pt-8 text-t-primary/60 font-medium hover:text-t-primary transition-colors"
      >
        &larr; Back to Home
      </button>
    </div>
  );
}
