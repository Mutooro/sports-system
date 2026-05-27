import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/common/Layout'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import CoachDashboard from './pages/CoachDashboard'
import StudentDashboard from './pages/StudentDashboard'
import AdminDashboard from './pages/AdminDashboard'
import PlayerManagement from './pages/PlayerManagement'
import PlayerDetail from './pages/PlayerDetail'
import Fixtures from './pages/Fixtures'
import MatchResults from './pages/MatchResults'
import Ratings from './pages/Ratings'
import MyProfile from './pages/MyProfile'
import Notifications from './pages/Notifications'
import NotFound from './pages/NotFound'

function App() {
  const { user } = useAuthStore()

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          {/* Role-based dashboards */}
          <Route path="/" element={
            user?.role === 'admin' ? <AdminDashboard /> :
            user?.role === 'coach' ? <CoachDashboard /> :
            <StudentDashboard />
          } />

          <Route path="/dashboard" element={
            user?.role === 'admin' ? <AdminDashboard /> :
            user?.role === 'coach' ? <CoachDashboard /> :
            <StudentDashboard />
          } />

          {/* Coach & Admin Routes */}
          <Route path="/players" element={<PlayerManagement />} />
          <Route path="/players/:id" element={<PlayerDetail />} />
          <Route path="/fixtures" element={<Fixtures />} />
          <Route path="/matches" element={<MatchResults />} />
          <Route path="/ratings" element={<Ratings />} />

          {/* Shared Routes */}
          <Route path="/profile" element={<MyProfile />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App