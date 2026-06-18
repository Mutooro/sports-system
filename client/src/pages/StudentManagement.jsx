import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserCircle, Search, Plus, CheckCircle, X, Users, Mail, Phone, Upload } from 'lucide-react'
import BulkImportModal from '../components/common/BulkImportModal'
import { toast } from 'react-toastify'
import { adminAPI } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useAuthStore } from '../store/authStore'

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'coach', label: 'Coach' }
]

const StudentManagement = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showCoachModal, setShowCoachModal] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    student_number: '',
    phone: ''
  })
  const [coachForm, setCoachForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    password: ''
  })

  const { data: studentsData, isLoading, isError, error } = useQuery({
    queryKey: ['students'],
    queryFn: () => adminAPI.getUsers({ role: 'student', limit: 100 }),
    enabled: isAdmin
  })

  const toggleStatusMutation = useMutation({
    mutationFn: adminAPI.toggleUserStatus,
    onSuccess: () => {
      toast.success('Student status updated')
      queryClient.invalidateQueries(['students'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status')
    }
  })

  const createStudentMutation = useMutation({
    mutationFn: (data) => adminAPI.createUser({ ...data, role: 'student' }),
    onSuccess: () => {
      toast.success('Student account created')
      setShowModal(false)
      setFormData({ email: '', first_name: '', last_name: '', student_number: '', phone: '' })
      queryClient.invalidateQueries(['students'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create student')
    }
  })

  const createCoachMutation = useMutation({
    mutationFn: (data) => adminAPI.createUser({ ...data, role: 'coach' }),
    onSuccess: () => {
      toast.success('Coach account created')
      setShowCoachModal(false)
      setCoachForm({ email: '', first_name: '', last_name: '', phone: '', password: '' })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create coach')
    }
  })

  const students = studentsData?.data?.data?.users || []
  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase()
    return (
      student.first_name?.toLowerCase().includes(query) ||
      student.last_name?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query) ||
      student.student_number?.toLowerCase().includes(query)
    )
  })

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCoachChange = (field, value) => {
    setCoachForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCreate = (e) => {
    e.preventDefault()
    createStudentMutation.mutate(formData)
  }

  const handleCreateCoach = (e) => {
    e.preventDefault()
    if (coachForm.password.length < 8) {
      toast.error('Coach password must be at least 8 characters')
      return
    }
    createCoachMutation.mutate(coachForm)
  }

  if (!isAdmin) {
    return (
      <div className="card text-center py-12">
        <Users className="mx-auto mb-3 text-gray-300" size={48} />
        <h1 className="text-xl font-semibold text-gray-900">Unauthorized</h1>
        <p className="text-gray-500">Only administrators can manage student accounts.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCircle className="text-primary-500" />
            Student Management
          </h1>
          <p className="text-gray-500">View and manage student accounts. Add athletic details from Player Management.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkImport(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Upload size={18} />
            Bulk Import
          </button>
          <button
            onClick={() => setShowCoachModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Coach
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Student
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="Search students by name, email, or student number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner className="h-64" />
        ) : isError ? (
          <div className="text-center py-12">
            <p className="text-red-600">Unable to load students.</p>
            <p className="text-sm text-gray-500">{error?.response?.data?.message || error?.message || 'Try refreshing the page.'}</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">No students found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Student</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Student #</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Hall</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Created</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm">
                          {student.first_name?.[0]}{student.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.first_name} {student.last_name}</p>
                          <p className="text-xs text-gray-500">ID: {student.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-gray-700">{student.student_number}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{student.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{student.playerProfile?.hall?.name || '�'}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${student.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {student.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{new Date(student.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => toggleStatusMutation.mutate(student.id)}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700"
                      >
                        {student.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add New Student</h2>
                <p className="text-sm text-gray-500">The student can later be assigned to a hall and team via Player Management.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input required type="text" value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input required type="text" value={formData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)} className="input-field" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input required type="email" value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student Number</label>
                  <input required type="text" value={formData.student_number}
                    onChange={(e) => handleChange('student_number', e.target.value)}
                    className="input-field" placeholder="21/U/1234" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input type="tel" value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)} className="input-field" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2">
                  <CheckCircle size={18} />
                  Create Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkImport && (
        <BulkImportModal
          onClose={() => setShowBulkImport(false)}
          queryKeysToInvalidate={[['students'], ['coaches'], ['players'], ['teams']]}
        />
      )}

      {/* Add Coach modal */}
      {showCoachModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add New Coach</h2>
                <p className="text-sm text-gray-500">Coach accounts have access to fixtures, matches, and player management.</p>
              </div>
              <button onClick={() => setShowCoachModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCoach} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input required type="text" value={coachForm.first_name}
                    onChange={(e) => handleCoachChange('first_name', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input required type="text" value={coachForm.last_name}
                    onChange={(e) => handleCoachChange('last_name', e.target.value)} className="input-field" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input required type="email" value={coachForm.email}
                  onChange={(e) => handleCoachChange('email', e.target.value)} className="input-field" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                  <input type="tel" value={coachForm.phone}
                    onChange={(e) => handleCoachChange('phone', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                  <input required type="password" value={coachForm.password} minLength={8}
                    onChange={(e) => handleCoachChange('password', e.target.value)} className="input-field" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowCoachModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={createCoachMutation.isPending}>
                  <CheckCircle size={18} />
                  {createCoachMutation.isPending ? 'Creating�' : 'Create Coach'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentManagement
