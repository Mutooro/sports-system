import apiClient from './api';

export const standingsApi = {
  // Get league table
  getTable: (params = {}) => apiClient.get('/standings/table', { params }),

  // Get season statistics
  getStats: (params = {}) => apiClient.get('/standings/stats', { params }),

  // Get upcoming fixtures
  getUpcoming: (params = {}) => apiClient.get('/standings/upcoming', { params }),

  // Get recent results
  getResults: (params = {}) => apiClient.get('/standings/results', { params })
};
