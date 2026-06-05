import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrders, type Order } from '../api/orders'
import { btnPrimary, card } from '../components/ui'
import { formatYen } from '../utils/format'

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await getOrders()
        if (!cancelled) setOrders(data)
      } catch {
        if (!cancelled) setError('注文履歴の取得に失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <p className="text-slate-500">読み込み中…</p>
  if (error) return <p className="text-rose-600">{error}</p>

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-bold text-slate-900">注文履歴</h1>
      {orders.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          <p>注文はまだありません。</p>
          <Link to="/" className={`${btnPrimary} mt-6`}>
            商品を見る
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                to={`/orders/${order.id}`}
                className={`${card} flex items-center gap-4 p-4 transition hover:shadow-md`}
              >
                <div className="flex-1">
                  <p className="font-semibold text-brand-700">{order.order_number}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(order.created_at).toLocaleString('ja-JP')}
                  </p>
                </div>
                <span className="font-semibold text-slate-800">{formatYen(order.total_amount)}</span>
                <span className="text-slate-300">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
