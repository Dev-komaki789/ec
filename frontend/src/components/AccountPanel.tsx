import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

// ログイン / 新規登録を切り替えられるパネル。成功したら onDone() で閉じる。
export function AccountPanel({ onDone }: { onDone: () => void }) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // フォーム入力
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

  return (
    <div className="account-panel">
      <div className="account-panel__tabs">
        <button
          type="button"
          className={mode === 'login' ? 'is-active' : ''}
          onClick={() => setMode('login')}
        >
          ログイン
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'is-active' : ''}
          onClick={() => setMode('register')}
        >
          新規登録
        </button>
      </div>

      <form className="account-form" onSubmit={handleSubmit}>
        <label>
          メールアドレス
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          パスワード
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {mode === 'register' && (
          <>
            <label>
              氏名
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
            <label>
              郵便番号
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </label>
            <label>
              住所
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
            <label>
              電話番号
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          </>
        )}

        {error && <p className="account-form__error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? '処理中…' : mode === 'login' ? 'ログイン' : '登録してログイン'}
        </button>
      </form>
    </div>
  )
}
