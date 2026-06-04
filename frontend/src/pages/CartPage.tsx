import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/http'
import { createOrder } from '../api/orders'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { formatYen } from '../utils/format'

export function CartPage() {
  const { user } = useAuth()
  const { cart, update, remove, refresh } = useCart()
  const navigate = useNavigate()

  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout() {
    setSubmitting(true)
    setError(null)
    try {
      const order = await createOrder({ note })
      await refresh() // サーバ側でカートが空になったので取り直す
      navigate(`/orders/${order.id}`)
    } catch (e) {
      if (e instanceof ApiError) {
        // 在庫不足(409)・配送先不備(400)・WMS障害(503) などはメッセージをそのまま出す。
        setError(e.message)
      } else {
        setError('注文に失敗しました')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="cart-page">
        <h1>カート</h1>
        <p className="page-status">カートは空です。</p>
      </div>
    )
  }

  const addressMissing = !user?.address

  return (
    <div className="cart-page">
      <h1>カート</h1>

      <table className="cart-table">
        <thead>
          <tr>
            <th>商品</th>
            <th>単価</th>
            <th>数量</th>
            <th>小計</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cart.items.map((item) => {
            const variant = [item.size_info, item.color_info].filter(Boolean).join(' / ')
            return (
              <tr key={item.id}>
                <td>
                  <div className="cart-table__name">{item.product_name}</div>
                  <div className="cart-table__variant">
                    {variant || item.sku_code}
                  </div>
                </td>
                <td>{item.unit_price != null ? formatYen(item.unit_price) : '—'}</td>
                <td>
                  <div className="qty-stepper">
                    <button
                      type="button"
                      onClick={() =>
                        item.quantity > 1
                          ? update(item.id, item.quantity - 1)
                          : remove(item.id)
                      }
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => update(item.id, item.quantity + 1)}>
                      ＋
                    </button>
                  </div>
                </td>
                <td>{item.line_total != null ? formatYen(item.line_total) : '—'}</td>
                <td>
                  <button
                    type="button"
                    className="cart-table__remove"
                    onClick={() => remove(item.id)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="cart-total">
        合計（税込）: <strong>{formatYen(cart.total_amount)}</strong>
      </div>

      <section className="checkout">
        <h2>お届け先</h2>
        {addressMissing ? (
          <p className="checkout__warn">
            プロフィールに住所が未登録です。注文には住所が必要です。
          </p>
        ) : (
          <p className="checkout__delivery">
            {user?.full_name}（{user?.postal_code}）{user?.address}
          </p>
        )}

        <label className="checkout__note">
          備考（任意）
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        {error && <p className="checkout__error">{error}</p>}

        <button
          type="button"
          className="checkout__submit"
          disabled={submitting || addressMissing}
          onClick={handleCheckout}
        >
          {submitting ? '注文処理中…' : '注文を確定する'}
        </button>
      </section>
    </div>
  )
}
