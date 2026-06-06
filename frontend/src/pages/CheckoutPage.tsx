import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/http'
import { createOrder } from '../api/orders'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { btnPrimary, card } from '../components/ui'
import { formatYen } from '../utils/format'

export function CheckoutPage() {
  const { user } = useAuth()
  const { cart, refresh } = useCart()
  const navigate = useNavigate()

  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // カートが空ならカートページへ戻す。
  if (!cart || cart.items.length === 0) return <Navigate to="/cart" replace />

  const addressMissing = !user?.address

  async function placeOrder() {
    setSubmitting(true)
    setError(null)
    try {
      const order = await createOrder({ note })
      // 先に完了ページへ遷移する（justOrdered で「ありがとう」表示）。
      // 順序が逆だと、refresh でカートが空になった瞬間にこのページの
      // 「空カートなら /cart へ」ガードが先に発火し、完了ページに行けない。
      navigate(`/orders/${order.id}`, { state: { justOrdered: true } })
      // 遷移後にカート(ヘッダーのバッジ)を更新する。await しない。
      void refresh()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '注文に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-bold text-slate-900">ご注文手続き</h1>

      <div className="space-y-5">
        {/* お届け先 */}
        <section className={`${card} p-5`}>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">お届け先</h2>
          {addressMissing ? (
            <p className="text-sm text-amber-600">
              プロフィールに住所が未登録です。注文には住所が必要です。
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              {user?.full_name}（{user?.postal_code}）<br />
              {user?.address}
            </p>
          )}
        </section>

        {/* 決済（モック） */}
        <section className={`${card} p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">お支払い方法</h2>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              モック決済
            </span>
          </div>
          <p className="mb-4 text-xs text-slate-400">
            これはデモです。実際の決済・課金は行われません。カード情報は送信されません。
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 flex flex-col gap-1 text-sm text-slate-600">
              カード番号
              <input
                disabled
                value="4242 4242 4242 4242"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              有効期限
              <input
                disabled
                value="12 / 30"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              セキュリティコード
              <input
                disabled
                value="123"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-400"
              />
            </label>
          </div>
        </section>

        {/* 備考 */}
        <section className={`${card} p-5`}>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            備考（任意）
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="配送に関する要望など"
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </label>
        </section>

        {/* 注文内容 + 確定 */}
        <section className={`${card} p-5`}>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">注文内容</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {cart.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2">
                <span className="text-slate-600">
                  {item.product_name}
                  <span className="text-slate-400"> × {item.quantity}</span>
                </span>
                <span className="text-slate-700">
                  {item.line_total != null ? formatYen(item.line_total) : '—'}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="font-medium text-slate-700">合計（税込）</span>
            <span className="text-xl font-bold text-slate-900">{formatYen(cart.total_amount)}</span>
          </div>

          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

          <button
            type="button"
            onClick={placeOrder}
            disabled={submitting || addressMissing}
            className={`${btnPrimary} mt-5 w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800`}
          >
            {submitting ? '注文処理中…' : `${formatYen(cart.total_amount)} を支払って注文を確定`}
          </button>
        </section>
      </div>
    </div>
  )
}
