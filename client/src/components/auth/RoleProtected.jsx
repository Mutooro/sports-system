import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const RoleProtected = ({ allowedRoles = [] }) => {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (!allowedRoles.includes(user?.role)) {
    // Redirect to dashboard if authenticated but unauthorized
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default RoleProtected
