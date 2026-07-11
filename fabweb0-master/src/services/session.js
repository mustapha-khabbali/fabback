import { firebase } from '../context/FirebaseContext';
import { api, getUserToken } from './api';

// iOS Safari can evict page storage mid-flow (private browsing, background
// tab kill), losing the API token while the registration form is still on
// screen. Re-mint the token from the Firebase session instead of letting the
// next request fail with 401 "Missing bearer token".
export async function ensureApiSession() {
  if (getUserToken()) return;

  await firebase.auth.authStateReady();
  let firebaseUser = firebase.auth.currentUser;

  if (!firebaseUser) {
    try {
      const credential = await firebase.signInWithPopup(firebase.auth, firebase.googleProvider);
      firebaseUser = credential.user;
    } catch {
      throw new Error('Votre session a expiré. Veuillez vous reconnecter avec Google.');
    }
  }

  const idToken = await firebaseUser.getIdToken();
  await api.googleLogin(idToken);
}
