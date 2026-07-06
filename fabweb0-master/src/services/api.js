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

  logout() {
    setUserToken(null);
  }
};
