const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
const USER_TOKEN_KEY = 'fablab_api_token';

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

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('content-type', 'application/json');

  const token = getUserToken();
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(body?.error || 'API request failed');
  }

  return body;
}

export const api = {
  async googleLogin(idToken) {
    const body = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken })
    });
    setUserToken(body.token);
    return body;
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

  logout() {
    setUserToken(null);
  }
};
