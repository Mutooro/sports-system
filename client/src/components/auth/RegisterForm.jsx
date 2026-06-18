import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { authAPI } from '../../services/api'

const RegisterForm = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { role: 'student' }
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      // Public /auth/register only mints student accounts. Strip any client
      // attempt to set role so it never reaches the server.
      const { confirm_password, ...payload } = data
      delete payload.role
      await authAPI.register(payload)
      toast.success('Registration successful! Please login.')
      navigate('/login')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <input
            {...register('first_name', { required: 'First name is required' })}
            className="input-field"
          />
          {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input
            {...register('last_name', { required: 'Last name is required' })}
            className="input-field"
          />
          {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Student Number</label>
        <input
          {...register('student_number', { required: 'Student number is required' })}
          className="input-field"
          placeholder="e.g., 21/U/1234"
        />
        {errors.student_number && <p className="text-red-500 text-xs mt-1">{errors.student_number.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          {...register('email', { required: 'Email is required' })}
          className="input-field"
          placeholder="you@example.com"
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
        <input
          type="tel"
          {...register('phone')}
          className="input-field"
          placeholder="+256 ..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Password must be at least 8 characters' } })}
            className="input-field pr-10"
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
      </div>

      <p className="text-xs text-gray-500">
        Public registration creates a student account. Coach and admin accounts are created by an administrator.
      </p>

      <button type="submit" disabled={isLoading} className="w-full btn-primary flex items-center justify-center gap-2 py-3">
        {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><UserPlus size={18} /> Create Account</>}
      </button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-500 hover:text-primary-600 font-medium">Sign in</Link>
      </p>
    </form>
  )
}

export default RegisterForm
