import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// ログイン必須ページのラッパー。未ログインなら /login へ飛ばす。
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="page-status">読み込み中…</p>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
