export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
const ADMIN_TOKEN_KEY = 'admin_api_token';

const ROLE_TO_UI = {
  stagiaire: 'Stagiaire',
  formateur: 'Formateur',
  administrateur: 'Administrateur',
  visiteur: 'Visiteur'
};

const ROLE_TO_API = {
  Stagiaire: 'stagiaire',
  Formateur: 'formateur',
  Administrateur: 'administrateur',
  Visiteur: 'visiteur'
};

function toUiUser(user) {
  return {
    ...user,
    role: ROLE_TO_UI[user.role] || user.role,
    year: user.year || user.annee || ''
  };
}

function toApiUser(user) {
  return {
    ...user,
    role: ROLE_TO_API[user.role] || user.role,
    annee: user.annee || user.year || null,
    charteAccepted: user.charteAccepted ?? true,
    reproductionAccepted: user.reproductionAccepted ?? true
  };
}

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
    if (response.status === 401) {
      setAdminToken(null);
    }
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

  async getUsers(params = {}) {
    const query = new URLSearchParams(params);
    const body = await request(`/users${query.size ? `?${query}` : ''}`);
    return (body.users || []).map(toUiUser);
  },

  async getUser(id) {
    const body = await request(`/users/${id}`);
    return toUiUser(body.user);
  },

  async createUser(user) {
    const body = await request('/users', {
      method: 'POST',
      body: JSON.stringify(toApiUser(user))
    });
    return toUiUser(body.user);
  },

  async updateUser(id, patch) {
    const body = await request(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(toApiUser(patch))
    });
    return toUiUser(body.user);
  },

  async setUserDeactivated(id, isDeactivated) {
    const body = await request(`/users/${id}/${isDeactivated ? 'deactivate' : 'reactivate'}`, {
      method: 'PATCH',
      body: JSON.stringify({})
    });
    return toUiUser(body.user);
  },

  // The comportement score is computed from the behavior ledger and has no
  // manual write path (see fablab-api services/behaviorScore.js).
  async getBehavior(userId) {
    return request(`/behavior/users/${encodeURIComponent(userId)}`);
  },

  async getBehaviorReports(status) {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
    const body = await request(`/behavior/reports${suffix}`);
    return body.reports || [];
  },

  async reviewBehaviorReport(id, status) {
    return request(`/behavior/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async revokeRecognition(id) {
    return request(`/behavior/recognitions/${id}/revoke`, { method: 'PATCH' });
  },

  async deleteUser(id) {
    await request(`/users/${id}`, { method: 'DELETE' });
  },

  async getEvents() {
    const body = await request('/events');
    return body.events || [];
  },

  async saveEvent(event) {
    const path = event.id ? `/events/${event.id}` : '/events';
    const body = await request(path, {
      method: event.id ? 'PATCH' : 'POST',
      body: JSON.stringify(event)
    });
    return body.event;
  },

  async deleteEvent(id) {
    await request(`/events/${id}`, { method: 'DELETE' });
  },

  async getAttendance(params = {}) {
    const query = new URLSearchParams(params);
    const body = await request(`/attendance${query.size ? `?${query}` : ''}`);
    return body.attendance || [];
  },

  async getProjects() {
    const body = await request('/projects');
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

  async saveGateConfig(config) {
    const body = await request('/gate/config', {
      method: 'PUT',
      body: JSON.stringify({ config })
    });
    return body.config;
  },

  async getPermanentGateQr(gate) {
    const body = await request(`/gate/permanent-qr/${gate}`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    return body.qr;
  },

  logout() {
    setAdminToken(null);
  }
};
