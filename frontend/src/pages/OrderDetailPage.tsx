import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOrder, type Order } from '../api/orders'
import { formatYen } from '../utils/format'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await getOrder(id!)
        if (!cancelled) setOrder(data)
      } catch {
        if (!cancelled) setError('注文の取得に失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) return <p className="page-status">読み込み中…</p>
  if (error || !order) return <p className="page-status page-status--error">{error}</p>

  return (
    <div className="order-detail">
      <p>
        <Link to="/orders">← 注文履歴へ</Link>
      </p>
      <h1>{order.order_number}</h1>

      <div className="order-detail__meta">
        <p>注文日時: {new Date(order.created_at).toLocaleString('ja-JP')}</p>
        <p>
          お届け先: {order.delivery_name}（{order.delivery_postal_code}）
          {order.delivery_address}
        </p>
        {order.wms_outbound_order_code && (
          <p className="order-detail__wms">
            出荷指示番号: {order.wms_outbound_order_code}（{order.wms_status}）
          </p>
        )}
        {order.note && <p>備考: {order.note}</p>}
      </div>

      <table className="order-items">
        <thead>
          <tr>
            <th>商品</th>
            <th>単価</th>
            <th>数量</th>
            <th>小計</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => {
            const variant = [item.size_info, item.color_info].filter(Boolean).join(' / ')
            return (
              <tr key={i}>
                <td>
                  <div>{item.product_name}</div>
                  <div className="order-items__variant">{variant || item.sku_code}</div>
                </td>
                <td>{formatYen(item.unit_price)}</td>
                <td>{item.quantity}</td>
                <td>{formatYen(item.line_total)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="order-detail__total">
        合計（税込）: <strong>{formatYen(order.total_amount)}</strong>
      </div>
    </div>
  )
}
