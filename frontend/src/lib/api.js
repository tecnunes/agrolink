import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('agrolink_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('agrolink_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Users
export const usersAPI = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Partners
export const partnersAPI = {
  list: () => api.get('/partners'),
  create: (data) => api.post('/partners', data),
  update: (id, data) => api.put(`/partners/${id}`, data),
  delete: (id) => api.delete(`/partners/${id}`),
};

// Clients
export const clientsAPI = {
  list: (search) => api.get('/clients', { params: { search } }),
  get: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
};

// Etapas
export const etapasAPI = {
  list: () => api.get('/etapas'),
  create: (data) => api.post('/etapas', data),
  update: (id, data) => api.put(`/etapas/${id}`, data),
  delete: (id) => api.delete(`/etapas/${id}`),
};

// Projects
export const projectsAPI = {
  list: (params) => api.get('/projects', { params }),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  nextStage: (id) => api.put(`/projects/${id}/next-stage`),
  archive: (id) => api.put(`/projects/${id}/archive`),
  cancel: (id, data) => api.put(`/projects/${id}/cancel`, data),
  addPendencia: (id, data) => api.post(`/projects/${id}/pendencia`, data),
  resolvePendencia: (id, index) => api.put(`/projects/${id}/pendencia/${index}/resolve`),
  addObservacao: (id, data) => api.post(`/projects/${id}/observacao`, data),
  updateDocuments: (id, data) => api.put(`/projects/${id}/documents`, data),
};

// Files
export const filesAPI = {
  list: (clientId) => api.get(`/files/${clientId}`),
  upload: (clientId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/upload/${clientId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  download: (clientId, filename) => api.get(`/files/${clientId}/${filename}`, { responseType: 'blob' }),
  delete: (clientId, filename) => api.delete(`/files/${clientId}/${filename}`),
};

// Config
export const configAPI = {
  get: () => api.get('/config'),
  uploadLogo: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/config/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateCamposExtras: (campos) => api.put('/config/campos-extras', { campos }),
};

// Reports
export const reportsAPI = {
  summary: (params) => api.get('/reports/summary', { params }),
};

// Dashboard
export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
};

export default api;
