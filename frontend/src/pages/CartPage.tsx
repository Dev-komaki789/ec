import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../cart/CartContext'
import { btnOutline, btnPrimary, card } from '../components/ui'
import { formatYen } from '../utils/format'

export function CartPage() {
  const { cart, update, remove } = useCart()
  const navigate = useNavigate()

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">カート</h1>
        <p className="mt-4 text-slate-500">カートは空です。</p>
        <Link to="/" className={`${btnPrimary} mt-6`}>
          商品を見る
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">カート</h1>
        <ul className="space-y-3">
          {cart.items.map((item) => {
            const variant = [item.size_info, item.color_info].filter(Boolean).join(' / ')
            return (
              <li key={item.id} className={`${card} p-4`}>
                {/* 上段: 商品名・バリエーション・単価 ＋ 削除 */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold break-words text-slate-800">{item.product_name}</p>
                    <p className="text-xs text-slate-500">{variant || item.sku_code}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.unit_price != null ? formatYen(item.unit_price) : '—'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="shrink-0 text-xs text-slate-400 transition hover:text-rose-600"
                  >
                    削除
                  </button>
                </div>

                {/* 下段: 数量ステッパー（左） ＋ 小計（右） */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        item.quantity > 1 ? update(item.id, item.quantity - 1) : remove(item.id)
                      }
                      className="h-9 w-9 rounded-md border border-slate-300 text-lg leading-none hover:bg-slate-50"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => update(item.id, item.quantity + 1)}
                      className="h-9 w-9 rounded-md border border-slate-300 text-lg leading-none hover:bg-slate-50"
                    >
                      ＋
                    </button>
                  </div>
                  <span className="font-semibold text-slate-800">
                    {item.line_total != null ? formatYen(item.line_total) : '—'}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* 注文サマリ（PC は右に固定、スマホは下に積む） */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className={`${card} p-5`}>
          <h2 className="text-sm font-semibold text-slate-700">注文サマリ</h2>
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>商品点数</span>
            <span>{cart.total_quantity} 点</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-slate-600">合計（税込）</span>
            <span className="text-xl font-bold text-slate-900">{formatYen(cart.total_amount)}</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/checkout')}
            className={`${btnPrimary} mt-5 w-full`}
          >
            レジに進む
          </button>
          <Link to="/" className={`${btnOutline} mt-2 w-full`}>
            買い物を続ける
          </Link>
        </div>
      </aside>
    </div>
  )
}
