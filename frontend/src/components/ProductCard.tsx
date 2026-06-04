import type { Product, Sku } from '../api/types'
import { formatYen } from '../utils/format'
import { AddToCartButton } from './AddToCartButton'
import { StockBadge } from './StockBadge'

// SKU の表示名: サイズ/カラーがあればそれを、無ければ SKU コードを出す。
function skuLabel(sku: Sku): string {
  const variant = [sku.size_info, sku.color_info].filter(Boolean).join(' / ')
  return variant || sku.sku_code
}

// 商品の代表価格（税込）を SKU 群から決める。
// バリエーション（サイズ/色）で価格が違いうるので、最安値を「〜」付きで出す。
function priceLabel(product: Product): string {
  const prices = product.skus
    .map((s) => s.price_incl_tax)
    .filter((p): p is number => p != null)

  if (prices.length === 0) return '価格未定'

  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? formatYen(min) : `${formatYen(min)} 〜`
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <div className="product-card__image">
        {product.image_url ? (
          <img src={product.image_url} alt={product.product_name} />
        ) : (
          <span className="product-card__noimage">画像なし</span>
        )}
      </div>
      <div className="product-card__body">
        <p className="product-card__category">{product.category_name}</p>
        <h3 className="product-card__name">{product.product_name}</h3>
        {product.manufacturer_name && (
          <p className="product-card__maker">{product.manufacturer_name}</p>
        )}
        <p className="product-card__price">{priceLabel(product)}</p>
        <ul className="product-card__skus">
          {product.skus.map((sku) => (
            <li key={sku.id} className="product-card__sku">
              <span className="product-card__sku-label">{skuLabel(sku)}</span>
              <span className="product-card__sku-actions">
                <StockBadge skuCode={sku.sku_code} />
                <AddToCartButton skuCode={sku.sku_code} />
              </span>
            </li>
          ))}
        </ul>
        <p className="product-card__code">{product.product_code}</p>
      </div>
    </article>
  )
}
