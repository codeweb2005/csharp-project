import { createContext, useContext, useEffect, useState } from 'react'
import { auth as authApi, clearTokens, getToken, setTokens } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if we have a valid token on mount
    const token = getToken()
    if (token && !user) {
      authApi.getMe()
        .then(res => {
          if (res.data?.role !== 'Admin') {
            clearTokens()
            setUser(null)
            localStorage.removeItem('user')
            return
          }
          setUser(res.data)
          localStorage.setItem('user', JSON.stringify(res.data))
        })
        .catch(() => {
          clearTokens()
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const res = await authApi.login(email, password)
    if (res.success) {
      const role = res.data.user?.role
      if (role !== 'Admin') {
        return { success: false, error: { code: 'FORBIDDEN', message: 'Account does not have admin access. Please use the vendor portal.' } }
      }
      setTokens(res.data.accessToken, res.data.refreshToken)
      setUser(res.data.user)
      localStorage.setItem('user', JSON.stringify(res.data.user))
    }
    return res
  }

  const logout = () => {
    clearTokens()
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be within AuthProvider')
  return context
}
