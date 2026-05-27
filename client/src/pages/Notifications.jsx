import { useQuery } from '@tanstack/react-query'
import { Bell, CheckCircle, Clock } from 'lucide-react'
import { notificationAPI } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'

const Notifications = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.getMyNotifications({ limit: 50 })
  })

  if (isLoading) return <LoadingSpinner className="h-96" />

  const notifications = data?.data?.data?.notifications || []

  const getIcon = (type) => {
    switch (type) {
      case 'fixture': return <Calendar className="text-blue-500" size={18} />
      case 'team_news': return <Users className="text-green-500" size={18} />
      case 'selection': return <CheckCircle className="text-purple-500" size={18} />
      default: return <Bell className="text-gray-500" size={18} />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-gray-500">Stay updated with your team and fixtures</p>
      </div>

      <div className="card">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`flex items-start gap-4 p-4 rounded-lg ${
                  notification.is_read ? 'bg-gray-50' : 'bg-blue-50 border border-blue-100'
                }`}
              >
                <div className="mt-0.5">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{notification.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Notifications