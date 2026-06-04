// 商品カタログ API クライアント。MVP では追加ライブラリを入れず素の fetch で実装する
//（axios / TanStack Query の採用は将来検討 / HANDOVER §12）。

import type { Paginated, Product } from './types'

// EC backend のベース URL。.env の VITE_API_BASE_URL から読む（末尾 /api/ec まで含む）。
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001/api/ec'

export interface ProductQuery {
  category?: string // カテゴリコード（例: CAT-001-01）
  search?: string // 商品名・商品コードの部分一致
}

export async function fetchProducts(query: ProductQuery = {}): Promise<Paginated<Product>> {
  const params = new URLSearchParams()
  if (query.category) params.set('category', query.category)
  if (query.search) params.set('search', query.search)

  const qs = params.toString()
  const url = `${BASE_URL}/products/${qs ? `?${qs}` : ''}`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`商品の取得に失敗しました (HTTP ${res.status})`)
  }
  return res.json() as Promise<Paginated<Product>>
}

export interface StockResult {
  sku_code: string
  stock: number
}

// 在庫数は商品一覧には含めず、必要なときだけこのエンドポイントで取りに行く
//（段階1: EC backend がそのつど WMS に問い合わせる / HANDOVER §7）。
export async function fetchStock(skuCode: string): Promise<StockResult> {
  const url = `${BASE_URL}/stock/?sku_code=${encodeURIComponent(skuCode)}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`在庫の取得に失敗しました (HTTP ${res.status})`)
  }
  return res.json() as Promise<StockResult>
}
