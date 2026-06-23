import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import ProtectedRoute from './components/auth/ProtectedRoute'
import RoleProtected from './components/auth/RoleProtected'
import Layout from './components/common/Layout'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import CoachDashboard from './pages/CoachDashboard'
import StudentDashboard from './pages/StudentDashboard'
import AdminDashboard from './pages/AdminDashboard'
import PlayerManagement from './pages/PlayerManagement'
import PlayerDetail from './pages/PlayerDetail'
import TeamManagement from './pages/TeamManagement'
import StudentManagement from './pages/StudentManagement'
import Fixtures from './pages/Fixtures'
import MatchResults from './pages/MatchResults'
import Ratings from './pages/Ratings'
import MyProfile from './pages/MyProfile'
import Notifications from './pages/Notifications'
import NotFound from './pages/NotFound'
import FixtureGenerator from './pages/FixtureGenerator'
import RecordMatch from './pages/RecordMatch'
import PlayerComparison from './pages/PlayerComparison'
import TacticsPage from './pages/TacticsPage'

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

          

          {/* Coach & Admin Routes (role-protected) */}
          <Route element={<RoleProtected allowedRoles={["coach", "admin"]} />}>
            <Route path="/players" element={<PlayerManagement />} />
            <Route path="/players/compare" element={<PlayerComparison />} />
            <Route path="/players/:id" element={<PlayerDetail />} />
            <Route path="/tactics" element={<TacticsPage />} />
            <Route path="/matches/record" element={<RecordMatch />} />
            <Route path="/teams" element={<TeamManagement />} />
            <Route path="/fixtures" element={<Fixtures />} />
            <Route path="/matches" element={<MatchResults />} />
            <Route path="/ratings" element={<Ratings />} />
          </Route>

          {/* Admin-only routes */}
          <Route element={<RoleProtected allowedRoles={["admin"]} />}>
            <Route path="/fixtures/generate" element={<FixtureGenerator />} />
            <Route path="/students" element={<StudentManagement />} />
          </Route>

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