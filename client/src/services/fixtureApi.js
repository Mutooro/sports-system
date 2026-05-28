import apiClient from './api';

export const fixtureApi = {
  // Get all fixtures with filters
  getAll: (params = {}) => apiClient.get('/fixtures', { params }),

  // Get fixture by ID
  getById: (id) => apiClient.get(`/fixtures/${id}`),

  // Create single fixture
  create: (data) => apiClient.post('/fixtures', data),

  // Preview auto-generated fixtures
  previewGeneration: (config) => apiClient.post('/fixtures/preview', config),

  // Auto-generate and save fixtures
  autoGenerate: (config) => apiClient.post('/fixtures/auto-generate', config),

  // Update fixture
  update: (id, data) => apiClient.put(`/fixtures/${id}`, data),

  // Bulk update fixtures
  bulkUpdate: (fixtures) => apiClient.put('/fixtures/bulk-update', { fixtures }),

  // Delete fixture
  delete: (id) => apiClient.delete(`/fixtures/${id}`),

  // Get calendar view
  getCalendar: (year, month, sport_type) => 
    apiClient.get('/fixtures/calendar', { params: { year, month, sport_type } })
};
