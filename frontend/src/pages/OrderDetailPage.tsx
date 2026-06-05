import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getOrder, type Order } from '../api/orders'
import { btnPrimary, card } from '../components/ui'
import { formatYen } from '../utils/format'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  // チェックアウト直後に遷移してきた場合だけ「ありがとう」を出す。
  const justOrdered = (location.state as { justOrdered?: boolean } | null)?.justOrdered ?? false

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

  if (loading) return <p className="text-slate-500">読み込み中…</p>
  if (error || !order) return <p className="text-rose-600">{error}</p>

  return (
    <div className="mx-auto max-w-3xl">
      {justOrdered && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-1 text-lg font-bold text-emerald-800">ご注文ありがとうございます</p>
          <p className="mt-1 text-sm text-emerald-700">
            注文番号 {order.order_number} を承りました。出荷準備に入ります。
          </p>
        </div>
      )}

      <Link to="/orders" className="text-sm text-slate-500 hover:text-brand-700">
        ← 注文履歴へ
      </Link>
      <h1 className="mt-2 mb-4 text-xl font-bold text-slate-900">{order.order_number}</h1>

      <div className={`${card} mb-5 space-y-1 p-5 text-sm text-slate-600`}>
        <p>注文日時: {new Date(order.created_at).toLocaleString('ja-JP')}</p>
        <p>
          お届け先: {order.delivery_name}（{order.delivery_postal_code}）{order.delivery_address}
        </p>
        {order.wms_outbound_order_code && (
          <p className="text-emerald-700">
            出荷指示番号: {order.wms_outbound_order_code}（{order.wms_status}）
          </p>
        )}
        {order.note && <p>備考: {order.note}</p>}
      </div>

      <div className={`${card} p-5`}>
        <ul className="divide-y divide-slate-100">
          {order.items.map((item, i) => {
            const variant = [item.size_info, item.color_info].filter(Boolean).join(' / ')
            return (
              <li key={i} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{item.product_name}</p>
                  <p className="text-xs text-slate-400">
                    {variant || item.sku_code} ／ {formatYen(item.unit_price)} × {item.quantity}
                  </p>
                </div>
                <span className="font-semibold text-slate-800">{formatYen(item.line_total)}</span>
              </li>
            )
          })}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="font-medium text-slate-700">合計（税込）</span>
          <span className="text-xl font-bold text-slate-900">{formatYen(order.total_amount)}</span>
        </div>
      </div>

      <Link to="/" className={`${btnPrimary} mt-6`}>
        買い物を続ける
      </Link>
    </div>
  )
}
