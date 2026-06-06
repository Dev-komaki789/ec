import { useState } from 'react'
import { updateMe } from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../components/Toast'
import { btnPrimary, card } from '../components/ui'

const inputClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none'

export function ProfilePage() {
  const { user, reloadUser } = useAuth()
  const { notify } = useToast()

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [postalCode, setPostalCode] = useState(user?.postal_code ?? '')
  const [address, setAddress] = useState(user?.address ?? '')
  const [phone, setPhone] = useState(user?.phone_number ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateMe({
        full_name: fullName,
        postal_code: postalCode,
        address,
        phone_number: phone,
      })
      await reloadUser()
      notify('プロフィールを更新しました', 'success')
    } catch {
      notify('更新に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-xl font-bold text-slate-900">プロフィール</h1>
      <form className={`${card} flex flex-col gap-4 p-6`} onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          メールアドレス
          <input
            type="email"
            value={user?.email ?? ''}
            disabled
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-400"
          />
        </label>
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

        <button type="submit" disabled={saving} className={`${btnPrimary} mt-1`}>
          {saving ? '保存中…' : '保存する'}
        </button>
      </form>
    </div>
  )
}
