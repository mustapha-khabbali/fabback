import { firebase } from '../context/FirebaseContext';

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
const USER_TOKEN_KEY = 'fablab_api_token';
const PUBLIC_API_PATHS = new Set(['/auth/google']);

export const USER_SESSION_EXPIRED_EVENT = 'user-session-expired';

let sessionRefreshPromise = null;

export function getUserToken() {
  return localStorage.getItem(USER_TOKEN_KEY);
}

export function setUserToken(token) {
  if (token) {
    localStorage.setItem(USER_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(USER_TOKEN_KEY);
  }
}

function pathWithoutQuery(path) {
  return path.split('?')[0];
}

function isPublicPath(path) {
  return PUBLIC_API_PATHS.has(pathWithoutQuery(path));
}

function notifySessionExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(USER_SESSION_EXPIRED_EVENT));
  }
}

export async function ensureUserToken({ interactive = false } = {}) {
  const storedToken = getUserToken();
  if (storedToken) return storedToken;

  if (sessionRefreshPromise) return sessionRefreshPromise;

  sessionRefreshPromise = (async () => {
    await firebase.authPersistenceReady;
    if (typeof firebase.auth.authStateReady === 'function') {
      await firebase.auth.authStateReady();
    }

    let firebaseUser = firebase.auth.currentUser;
    if (!firebaseUser && interactive) {
      const credential = await firebase.signInWithPopup(firebase.auth, firebase.googleProvider);
      firebaseUser = credential.user;
    }

    if (!firebaseUser) {
      throw new Error('Votre session a expiré. Veuillez vous reconnecter.');
    }

    const idToken = await firebaseUser.getIdToken();
    const body = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
      auth: false
    });
    setUserToken(body.token);
    return body.token;
  })();

  try {
    return await sessionRefreshPromise;
  } finally {
    sessionRefreshPromise = null;
  }
}

async function request(path, options = {}, attempt = 0) {
  const { auth = true, ...fetchOptions } = options;
  const headers = new Headers(options.headers || {});
  headers.set('content-type', 'application/json');

  const needsAuth = auth && !isPublicPath(path);
  let token = getUserToken();
  if (needsAuth && !token) {
    try {
      token = await ensureUserToken();
    } catch (error) {
      notifySessionExpired();
      throw error;
    }
  }

  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (response.status === 401 && needsAuth) {
      // Only drop the stored token when this 401 is about the token we actually
      // sent — a late 401 from a request made with an older token must not wipe
      // a session established in the meantime.
      if (token && getUserToken() === token) {
        setUserToken(null);
      }

      if (attempt === 0) {
        try {
          await ensureUserToken();
          return request(path, options, attempt + 1);
        } catch {
          // Fall through to the single app-level session-expired event below.
        }
      }

      notifySessionExpired();
    } else if (response.status === 401 && token && getUserToken() === token) {
      setUserToken(null);
    }
    throw new Error(body?.error || 'API request failed');
  }

  return body;
}

export const api = {
  async googleLogin(idToken) {
    const body = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
      auth: false
    });
    setUserToken(body.token);
    return body;
  },

  async getCurrentUser() {
    const body = await request('/auth/me');
    return body.user;
  },

  async register(profile) {
    const body = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...profile,
        annee: profile.annee || profile.year || null,
        charteAccepted: profile.charteAccepted ?? true,
        reproductionAccepted: profile.reproductionAccepted ?? true
      })
    });
    return body.user;
  },

  async getUsers(params = {}) {
    const query = new URLSearchParams(params);
    const body = await request(`/users${query.size ? `?${query}` : ''}`);
    return body.users || [];
  },

  async getUser(id) {
    const body = await request(`/users/${id}`);
    return body.user;
  },

  async createUser(user) {
    const body = await request('/users', {
      method: 'POST',
      body: JSON.stringify(user)
    });
    return body.user;
  },

  async updateUser(id, patch) {
    const body = await request(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });
    return body.user;
  },

  // Approve/decline a contact request. On approval the server adds the
  // requester to my allow-list, shares my coordinates, and notifies them.
  async respondContactRequest({ requesterId, notificationId, approve }) {
    const body = await request('/users/contact-approval', {
      method: 'POST',
      body: JSON.stringify({ requesterId, notificationId, approve })
    });
    return body;
  },

  async getGateConfig() {
    return request('/gate/config');
  },

  async checkIn(payload) {
    const body = await request('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return body.attendance;
  },

  async checkOut(payload) {
    const body = await request('/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return body.attendance;
  },

  async getOpenAttendance() {
    const body = await request('/attendance/open');
    return body.attendance;
  },

  async getMyAttendance() {
    const body = await request('/attendance/mine');
    return body.attendance || [];
  },

  async getUserAttendance(userId) {
    const body = await request(`/attendance/user/${encodeURIComponent(userId)}`);
    return body.attendance || [];
  },

  async getProjects() {
    const body = await request('/projects');
    return body.projects || [];
  },

  async getUserProjects(userId) {
    const body = await request(`/projects/user/${encodeURIComponent(userId)}`);
    return body.projects || [];
  },

  async createProject(project) {
    const body = await request('/projects', {
      method: 'POST',
      body: JSON.stringify(project)
    });
    return body.project;
  },

  async syncProjects(projects) {
    const body = await request('/projects/sync', {
      method: 'PUT',
      body: JSON.stringify({ projects })
    });
    return body.projects || [];
  },

  // Accept/decline my own contributor invitation. Goes through a dedicated
  // endpoint because /projects/sync drops writes from PENDING contributors.
  async respondProjectInvitation(projectId, action) {
    const body = await request(`/projects/${projectId}/invitation`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
    return { projects: body.projects || [], accepted: Boolean(body.accepted) };
  },

  async getRecycleBin() {
    const body = await request('/projects/recycle-bin');
    return body.recycleBin || [];
  },

  async syncRecycleBin(recycleBin) {
    const body = await request('/projects/recycle-bin', {
      method: 'PUT',
      body: JSON.stringify({ recycleBin })
    });
    return body.recycleBin || [];
  },

  async getNotifications() {
    const body = await request('/notifications');
    return body.notifications || [];
  },

  async createNotification(notification) {
    const body = await request('/notifications', {
      method: 'POST',
      body: JSON.stringify(notification)
    });
    return body.notifications || [];
  },

  async updateNotification(id, patch) {
    const body = await request(`/notifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });
    return body.notification;
  },

  async offerInteractionRequest(requestId, payload = {}) {
    const body = await request(`/interactions/requests/${requestId}/offer`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return body.offer;
  },

  async approveInteractionOffer(offerId, payload = {}) {
    const body = await request(`/interactions/offers/${offerId}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return body.offer;
  },

  async rejectInteractionOffer(offerId, payload = {}) {
    const body = await request(`/interactions/offers/${offerId}/reject`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return body.offer;
  },

  async completeHelpInteraction(offerId, payload = {}) {
    const body = await request(`/interactions/offers/${offerId}/complete-help`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return body.offer;
  },

  async rateInteractionOffer(offerId, payload = {}) {
    const body = await request(`/interactions/offers/${offerId}/rate`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return body.offer;
  },

  async createReview(review) {
    const body = await request('/reviews', {
      method: 'POST',
      body: JSON.stringify(review)
    });
    return body.review;
  },

  async sendRecognition(payload) {
    const body = await request('/behavior/recognitions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return body.recognition;
  },

  async sendReport(payload) {
    const body = await request('/behavior/reports', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return body.report;
  },

  logout() {
    setUserToken(null);
  }
};
