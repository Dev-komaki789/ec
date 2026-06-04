// EC backend が返す JSON の型。catalog/serializers.py と対応させる。

export interface Sku {
  id: number
  sku_code: string
  jan_code: string
  size_info: string
  color_info: string
  quantity_per_unit: number
  // 価格は EC 独自データ。未設定なら null。
  price: number | null
  price_incl_tax: number | null
}

export interface Product {
  id: number
  product_code: string
  product_name: string
  category_code: string
  category_name: string
  manufacturer_name: string
  description: string
  image_url: string | null
  skus: Sku[]
}

// DRF PageNumberPagination のレスポンス形。
export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
