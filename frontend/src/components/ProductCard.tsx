import { Link } from 'react-router-dom'
import type { Product } from '../api/types'
import { formatYen } from '../utils/format'
import { AddToCartButton } from './AddToCartButton'
import { btnOutline, card } from './ui'

// 商品の代表価格（税込）。バリエーションで価格が違いうるので最安値を「〜」付きで。
function priceLabel(product: Product): string {
  const prices = product.skus.map((s) => s.price_incl_tax).filter((p): p is number => p != null)
  if (prices.length === 0) return '価格未定'
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? formatYen(min) : `${formatYen(min)} 〜`
}

export function ProductCard({ product }: { product: Product }) {
  const singleSku = product.skus.length === 1 ? product.skus[0] : null

  return (
    <div className={`${card} group flex flex-col overflow-hidden transition hover:shadow-md`}>
      <Link to={`/products/${product.id}`} className="block">
        <div className="aspect-square overflow-hidden bg-slate-100">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.product_name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-300">画像なし</div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.category_name && (
          <span className="text-xs font-medium text-brand-600">{product.category_name}</span>
        )}
        <Link
          to={`/products/${product.id}`}
          className="line-clamp-2 font-semibold text-slate-800 transition hover:text-brand-700"
        >
          {product.product_name}
        </Link>
        {product.manufacturer_name && (
          <span className="text-xs text-slate-500">{product.manufacturer_name}</span>
        )}
        <span className="mt-1 text-lg font-bold text-slate-900">{priceLabel(product)}</span>

        <div className="mt-auto pt-3">
          {singleSku ? (
            <AddToCartButton skuCode={singleSku.sku_code} block />
          ) : (
            // 複数バリエーションは詳細ページで選んでもらう。
            <Link to={`/products/${product.id}`} className={`${btnOutline} w-full`}>
              種類を選ぶ
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
