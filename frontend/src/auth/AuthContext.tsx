// ログイン状態をアプリ全体で共有する Context。
// どの画面からでも useAuth() で「今ログインしているか / 誰か」を参照でき、
// login / register / logout を呼べる。

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  fetchMe,
  login as apiLogin,
  register as apiRegister,
  type Me,
  type RegisterPayload,
} from '../api/auth'
import { clearTokens, getTokens } from './tokenStore'

interface AuthContextValue {
  user: Me | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  // 起動時: 保存済みトークンがあれば /me を叩いてログイン状態を復元する。
  useEffect(() => {
    async function restore() {
      const { access, refresh } = getTokens()
      if (!access && !refresh) {
        setLoading(false)
        return
      }
      try {
        setUser(await fetchMe())
      } catch {
        clearTokens()
      } finally {
        setLoading(false)
      }
    }
    restore()
  }, [])

  async function login(email: string, password: string) {
    await apiLogin(email, password)
    setUser(await fetchMe())
  }

  async function register(payload: RegisterPayload) {
    await apiRegister(payload)
    // 登録後はそのままログインさせる。
    await login(payload.email, payload.password)
  }

  function logout() {
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth は AuthProvider の中で使ってください')
  return ctx
}
