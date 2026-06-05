import { useState } from 'react'
import { fetchStock } from '../api/catalog'

// 1 SKU 分の在庫を「ボタンを押したときだけ」取得して表示する。
// 一覧描画時には在庫 API を叩かない（WMS への都度問い合わせを最小限に / 段階1）。
export function StockBadge({ skuCode }: { skuCode: string }) {
  const [stock, setStock] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function check() {
    setLoading(true)
    setError(false)
    try {
      const result = await fetchStock(skuCode)
      setStock(result.stock)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (stock !== null) {
    const inStock = stock > 0
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
        }`}
      >
        {inStock ? `在庫 ${stock}` : '在庫なし'}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={check}
      disabled={loading}
      className="inline-flex items-center rounded-full border border-slate-300 px-2.5 py-0.5 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
    >
      {loading ? '確認中…' : error ? '再試行' : '在庫を見る'}
    </button>
  )
}
