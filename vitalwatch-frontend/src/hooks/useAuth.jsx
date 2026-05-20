/**
 * hooks/useAuth.jsx
 * ──────────────────
 * Manages login state and user role.
 * Works with the stub auth backend (auth.py).
 *
 * Session is stored in an httpOnly cookie set by the backend.
 * On every page load, GET /api/auth/me is called to restore
 * the session. If it returns 401 the user is sent to login.
 */

import { useState, useEffect, createContext, useContext } from 'react'
import { authApi } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount — restore session from cookie via /api/auth/me
  useEffect(() => {
    authApi.me()
      .then(data  => setUser(data))
      .catch(()   => setUser(null))  // 401 = no session, stay on login
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const data = await authApi.login(email, password)
    // Backend sets the session cookie, we just store the user object
    setUser(data.user)
    return data.user
  }

  async function logout() {
    await authApi.logout().catch(() => {})
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
