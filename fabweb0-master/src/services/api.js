export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
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

  async getUserAttendance(userId) {
    const body = await request(`/attendance/user/${encodeURIComponent(userId)}`);
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

  async createReview(review) {
    const body = await request('/reviews', {
      method: 'POST',
      body: JSON.stringify(review)
    });
    return body.review;
  },

  logout() {
    setUserToken(null);
  }
};
