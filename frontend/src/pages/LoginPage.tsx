import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AccountPanel } from '../components/AccountPanel'

export function LoginPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // すでにログイン済みなら商品一覧へ。
  if (user) return <Navigate to="/" replace />

  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="mb-6 text-center text-xl font-bold text-slate-900">アカウント</h1>
      <AccountPanel onDone={() => navigate('/')} />
    </div>
  )
}
