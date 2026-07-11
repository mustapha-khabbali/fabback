import { ensureUserToken } from './api';

// iOS Safari can evict page storage mid-flow (private browsing, background
// tab kill), losing the API token while the registration form is still on
// screen. Re-mint the token from the Firebase session instead of letting the
// next request fail with 401 "Missing bearer token".
export async function ensureApiSession() {
  await ensureUserToken({ interactive: true });
}
