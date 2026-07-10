import { useState, useCallback } from 'react';
import { useApp, SCREENS } from '../../context/AppContext';
import { ensureUserIdentity } from '../../utils/userIdentity';
import { useFirebase } from '../../context/FirebaseContext';
import { api } from '../../services/api';

const introImages = ['intro.webp', 'intro1.webp', 'intro2.webp', 'intro3.webp', 'intro4.webp', 'intro5.webp', 'intro6.webp', 'intro7.webp', 'intro8.webp'];

export default function HomeScreen() {
  const { navigateTo, setCurrentUser, showLogin, showNotification } = useApp();
  const firebase = useFirebase();
  const [currentImage, setCurrentImage] = useState(() => introImages[Math.floor(Math.random() * introImages.length)]);
  const [authLoading, setAuthLoading] = useState(null); // 'google' | 'outlook' | null

  const randomizeImage = useCallback(() => {
    let newImage;
    do {
      newImage = introImages[Math.floor(Math.random() * introImages.length)];
    } while (newImage === currentImage);
    setCurrentImage(newImage);
  }, [currentImage]);

  const handleAuth = useCallback(async (provider) => {
    setAuthLoading(provider);

    try {
      if (provider !== 'google') return;

      await firebase.authPersistenceReady;
      const credential = await firebase.signInWithPopup(firebase.auth, firebase.googleProvider);
      const idToken = await credential.user.getIdToken();
      const session = await api.googleLogin(idToken);

      if (session.user) {
        setCurrentUser(ensureUserIdentity(session.user));
        showLogin();
      } else {
        setCurrentUser({});
        navigateTo(SCREENS.ROLE_SELECTION);
      }
    } catch (error) {
      showNotification(error.message || "Connexion impossible.", 'error');
    } finally {
      setAuthLoading(null);
    }
  }, [firebase, navigateTo, setCurrentUser, showLogin, showNotification]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full transition-all duration-500 mobile-padding">
      <div className="w-full max-w-[340px] sm:max-w-[400px] md:max-w-[450px] flex flex-col items-center space-y-0">

        {/* Logo */}
        <div className="shrink-0 logo-header">
          <img src="/youth.webp" alt="Youth 5.0 Logo" className="w-full h-auto object-contain" />
        </div>

        {/* Illustration */}
        <div className="w-full drop-shadow-2xl illustration-container">
          <img
            id="intro-image"
            src={`/${currentImage}`}
            alt="Innovation Illustration"
            className="w-full h-auto object-contain cursor-pointer transition-opacity duration-300 hover:opacity-90"
            onClick={randomizeImage}
          />
        </div>

        {/* Tagline */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold text-t-primary leading-tight tracking-tight">
            From Imagination <br /> to Prototype.
          </h1>
        </div>

        {/* Auth Buttons */}
        <div className="w-full flex flex-col space-y-4 pt-4">
          <button
            disabled
            className="invisible pointer-events-none w-full py-4 bg-t-surface text-t-primary font-bold text-lg rounded-2xl border border-t-border shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center space-x-3"
          >
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/microsoft.svg" className="w-6 h-6" alt="Microsoft" />
              <span>Continuer avec Outlook</span>
            </>
          </button>

          <button
            onClick={() => handleAuth('google')}
            className="w-full py-4 bg-t-surface text-t-primary font-bold text-lg rounded-2xl border border-t-border shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center space-x-3"
          >
            {authLoading === 'google' ? (
              <span>Patientez...</span>
            ) : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                <span>Continuer avec Google</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
