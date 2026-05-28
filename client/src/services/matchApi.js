import apiClient from './api';

export const matchApi = {
  // Get all matches
  getAll: (params = {}) => apiClient.get('/matches', { params }),

  // Get match by ID
  getById: (id) => apiClient.get(`/matches/${id}`),

  // Create match result
  create: (data) => apiClient.post('/matches', data),

  // Update match result
  update: (id, data) => apiClient.put(`/matches/${id}`, data),

  // Delete match result
  delete: (id) => apiClient.delete(`/matches/${id}`),

  // Add player performance
  addPerformance: (matchId, data) => apiClient.post(`/matches/${matchId}/performances`, data),

  // Get match performances
  getPerformances: (matchId) => apiClient.get(`/matches/${matchId}/performances`),

  // Update performance
  updatePerformance: (performanceId, data) => apiClient.put(`/matches/performances/${performanceId}`, data),

  // Delete performance
  deletePerformance: (performanceId) => apiClient.delete(`/matches/performances/${performanceId}`),

  // Get top scorers
  getTopScorers: (params = {}) => apiClient.get('/matches/top-scorers', { params }),

  // Get top performers
  getTopPerformers: (params = {}) => apiClient.get('/matches/top-performers', { params })
};
