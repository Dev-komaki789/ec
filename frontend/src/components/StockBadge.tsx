import { useState } from 'react'
import { fetchStock } from '../api/catalog'

// 1 SKU 分の在庫を「ボタンを押したときだけ」取得して表示する。
// 商品一覧の描画時には在庫 API を叩かない（WMS への都度問い合わせを最小限にする）。
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
      <span className={`stock-badge ${inStock ? 'stock-badge--ok' : 'stock-badge--out'}`}>
        {inStock ? `在庫 ${stock}` : '在庫なし'}
      </span>
    )
  }

  return (
    <button type="button" className="stock-badge__btn" onClick={check} disabled={loading}>
      {loading ? '確認中…' : error ? '再試行' : '在庫を見る'}
    </button>
  )
}
