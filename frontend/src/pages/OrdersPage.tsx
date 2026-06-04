import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrders, type Order } from '../api/orders'
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

  if (loading) return <p className="page-status">読み込み中…</p>
  if (error) return <p className="page-status page-status--error">{error}</p>

  return (
    <div className="orders-page">
      <h1>注文履歴</h1>
      {orders.length === 0 ? (
        <p className="page-status">注文はまだありません。</p>
      ) : (
        <ul className="order-list">
          {orders.map((order) => (
            <li key={order.id} className="order-list__item">
              <Link to={`/orders/${order.id}`} className="order-list__link">
                <span className="order-list__number">{order.order_number}</span>
                <span className="order-list__date">
                  {new Date(order.created_at).toLocaleString('ja-JP')}
                </span>
                <span className="order-list__total">{formatYen(order.total_amount)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
