import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AccountPanel } from '../components/AccountPanel'

export function LoginPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // すでにログイン済みなら商品一覧へ。
  if (user) return <Navigate to="/" replace />

  return (
    <div className="auth-page">
      <AccountPanel onDone={() => navigate('/')} />
    </div>
  )
}
