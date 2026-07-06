const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
const ADMIN_TOKEN_KEY = 'admin_api_token';

export function getAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token) {
  if (token) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('content-type', 'application/json');

  const token = getAdminToken();
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
  async adminLogin(email, password) {
    const body = await request('/auth/admin', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAdminToken(body.token);
    return body;
  },

  logout() {
    setAdminToken(null);
  }
};
