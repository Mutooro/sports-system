import { NavLink, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, Users, Calendar, Trophy, 
  Bell, Settings, LogOut, Shield, BarChart3, UserCircle, Wand2 
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const Sidebar = () => {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  const coachLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/players', icon: Users, label: 'Players' },
    { to: '/fixtures', icon: Calendar, label: 'Fixtures' },
    { to: '/teams', icon: Shield, label: 'Teams' },
    { to: '/matches', icon: Trophy, label: 'Matches' },
    { to: '/ratings', icon: BarChart3, label: 'Ratings' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
  ]

  const studentLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/fixtures', icon: Calendar, label: 'Fixtures' },
    { to: '/ratings', icon: BarChart3, label: 'Ratings' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
  ]

  const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/players', icon: Users, label: 'Players' },
    { to: '/fixtures', icon: Calendar, label: 'Fixtures' },
    { to: '/teams', icon: Shield, label: 'Teams' },
    { to: '/ratings', icon: BarChart3, label: 'Ratings' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
  ]

  const links = user?.role === 'admin' ? adminLinks : user?.role === 'coach' ? coachLinks : studentLinks

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col z-50">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
            <Trophy className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-gray-900 leading-tight">Makerere Sports</h1>
            <p className="text-xs text-gray-500">Management System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => 
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <link.icon size={20} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 space-y-1">
        <NavLink to="/profile" className="sidebar-link">
          <UserCircle size={20} />
          <span>My Profile</span>
        </NavLink>
        <button
          onClick={() => { logout(); window.location.href = '/login' }}
          className="w-full sidebar-link text-red-600 hover:bg-red-50"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar