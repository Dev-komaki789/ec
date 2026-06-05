import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProduct } from '../api/catalog'
import type { Product, Sku } from '../api/types'
import { AddToCartButton } from '../components/AddToCartButton'
import { StockBadge } from '../components/StockBadge'
import { card } from '../components/ui'
import { formatYen } from '../utils/format'

function skuLabel(sku: Sku): string {
  return [sku.size_info, sku.color_info].filter(Boolean).join(' / ') || sku.sku_code
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [selectedSku, setSelectedSku] = useState<Sku | null>(null)
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const p = await fetchProduct(id!)
        if (cancelled) return
        setProduct(p)
        setSelectedSku(p.skus[0] ?? null)
        setQty(1)
      } catch {
        if (!cancelled) setError('商品が見つかりませんでした')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-xl bg-slate-200" />
        <div className="space-y-4">
          <div className="h-6 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-1/3 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    )
  }
  if (error || !product) return <p className="text-rose-600">{error}</p>

  const price = selectedSku?.price_incl_tax ?? null

  return (
    <div>
      <nav className="mb-6 text-sm text-slate-500">
        <Link to="/" className="hover:text-brand-700">
          商品一覧
        </Link>
        {product.category_name && (
          <>
            <span className="mx-2">/</span>
            <Link
              to={`/?category=${product.category_code}`}
              className="hover:text-brand-700"
            >
              {product.category_name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* 画像 */}
        <div className={`${card} aspect-square overflow-hidden`}>
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.product_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-slate-300">画像なし</div>
          )}
        </div>

        {/* 情報 */}
        <div className="flex flex-col gap-4">
          <div>
            {product.manufacturer_name && (
              <p className="text-sm text-slate-500">{product.manufacturer_name}</p>
            )}
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{product.product_name}</h1>
            <p className="mt-1 text-xs text-slate-400">{product.product_code}</p>
          </div>

          <p className="text-3xl font-bold text-slate-900">
            {price != null ? formatYen(price) : '価格未定'}
            <span className="ml-1 text-sm font-normal text-slate-400">（税込）</span>
          </p>

          {product.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {product.description}
            </p>
          )}

          {/* SKU（バリエーション）選択 */}
          {product.skus.length > 1 && (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">種類を選択</p>
              <div className="flex flex-wrap gap-2">
                {product.skus.map((sku) => {
                  const isSel = selectedSku?.id === sku.id
                  return (
                    <button
                      key={sku.id}
                      type="button"
                      onClick={() => setSelectedSku(sku)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                        isSel
                          ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {skuLabel(sku)}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 在庫 + 数量 + カート */}
          {selectedSku && (
            <div className={`${card} mt-2 flex flex-col gap-4 p-4`}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">在庫</span>
                <StockBadge skuCode={selectedSku.sku_code} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">数量</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="h-8 w-8 rounded-md border border-slate-300 text-lg leading-none hover:bg-slate-50"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-medium">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                    className="h-8 w-8 rounded-md border border-slate-300 text-lg leading-none hover:bg-slate-50"
                  >
                    ＋
                  </button>
                </div>
              </div>

              <AddToCartButton
                skuCode={selectedSku.sku_code}
                quantity={qty}
                block
                disabled={price == null}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
