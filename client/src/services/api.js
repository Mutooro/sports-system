import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
        const { accessToken } = response.data.data
        useAuthStore.getState().updateTokens({ accessToken })
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login:      (credentials) => api.post('/auth/login', credentials),
  register:   (data)        => api.post('/auth/register', data),
  refresh:    (token)       => api.post('/auth/refresh', { refreshToken: token }),
  logout:     ()            => api.post('/auth/logout'),
  me:         ()            => api.get('/auth/me'),
  getCoaches: ()            => api.get('/auth/coaches')
}

export const playerAPI = {
  getAll:  (params) => api.get('/players', { params }),
  getById: (id)     => api.get(`/players/${id}`),
  create:  (data)   => api.post('/players', data),
  update:  (id, data) => api.put(`/players/${id}`, data),
  delete:  (id)     => api.delete(`/players/${id}`),
  search:  (query)  => api.get('/players/search', { params: { q: query } })
}

export const teamAPI = {
  getAll:     (params) => api.get('/teams', { params }),
  getById:    (id)     => api.get(`/teams/${id}`),
  create:     (data)   => api.post('/teams', data),
  update:     (id, data) => api.put(`/teams/${id}`, data),
  delete:     (id)     => api.delete(`/teams/${id}`),
  getPlayers: (id)     => api.get(`/teams/${id}/players`),
  getRatings: (id)     => api.get(`/teams/${id}/ratings`)
}

export const fixtureAPI = {
  getAll:             (params) => api.get('/fixtures', { params }),
  getById:            (id)     => api.get(`/fixtures/${id}`),
  create:             (data)   => api.post('/fixtures', data),
  update:             (id, data) => api.put(`/fixtures/${id}`, data),
  delete:             (id)     => api.delete(`/fixtures/${id}`),
  autoGenerate:       (data)   => api.post('/fixtures/auto-generate', data),
  previewGeneration:  (data)   => api.post('/fixtures/preview', data),
  getCalendar:        (params) => api.get('/fixtures/calendar', { params }),
  bulkUpdate:         (data)   => api.put('/fixtures/bulk-update', data)
}

export const matchAPI = {
  getAll:         (params)       => api.get('/matches', { params }),
  getById:        (id)           => api.get(`/matches/${id}`),
  getRecent:      (limit = 5)    => api.get('/matches/recent', { params: { limit } }),
  create:         (data)         => api.post('/matches', data),
  update:         (id, data)     => api.put(`/matches/${id}`, data),
  addPerformance: (matchId, data) => api.post(`/matches/${matchId}/performances`, data)
}

export const standingsAPI = {
  getStandings:  (params) => api.get('/standings', { params }),
  getSeasonStats: (params) => api.get('/standings/season-stats', { params })
}

export const ratingAPI = {
  calculate:      (playerId) => api.post(`/ratings/calculate/${playerId}`),
  getTeamRatings: (teamId)   => api.get(`/ratings/team/${teamId}`),
  getLeaderboard: (params)   => api.get('/ratings/leaderboard', { params })
}

export const notificationAPI = {
  getMyNotifications: (params) => api.get('/notifications', { params }),
  markAsRead:         (id)     => api.put(`/notifications/${id}/read`),
  sendBulk:           (data)   => api.post('/notifications/send', data)
}

export const adminAPI = {
  getUsers:          (params) => api.get('/admin/users', { params }),
  toggleUserStatus:  (id)     => api.put(`/admin/users/${id}/toggle`),
  getAuditLogs:      (params) => api.get('/admin/audit-logs', { params }),
  getDashboardStats: ()       => api.get('/admin/dashboard-stats')
}

export const hallAPI = {
  getAll:  ()   => api.get('/halls'),
  getById: (id) => api.get(`/halls/${id}`)
}

export default api