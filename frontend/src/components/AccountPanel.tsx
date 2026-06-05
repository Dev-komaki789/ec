import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { btnPrimary } from './ui'

const inputClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none'

// ログイン / 新規登録を切り替えられるパネル。成功したら onDone() で閉じる。
export function AccountPanel({ onDone }: { onDone: () => void }) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register({
          email,
          password,
          full_name: fullName,
          postal_code: postalCode,
          address,
          phone_number: phone,
        })
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : '失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  function tab(target: 'login' | 'register', label: string) {
    const active = mode === target
    return (
      <button
        type="button"
        onClick={() => setMode(target)}
        className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
          active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex gap-2">
        {tab('login', 'ログイン')}
        {tab('register', '新規登録')}
      </div>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          メールアドレス
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          パスワード
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>

        {mode === 'register' && (
          <>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              氏名
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                郵便番号
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                電話番号
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              住所
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
              />
            </label>
          </>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button type="submit" disabled={submitting} className={`${btnPrimary} mt-1 w-full`}>
          {submitting ? '処理中…' : mode === 'login' ? 'ログイン' : '登録してログイン'}
        </button>
      </form>
    </div>
  )
}
