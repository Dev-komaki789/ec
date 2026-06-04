// カート API。すべて認証必須なので apiFetch（Bearer 自動付与）を通す。

import { apiFetch } from './http'

export interface CartItem {
  id: number
  sku_code: string
  product_name: string
  size_info: string
  color_info: string
  quantity: number
  unit_price: number | null
  line_total: number | null
}

export interface Cart {
  items: CartItem[]
  total_quantity: number
  total_amount: number
}

export const getCart = () => apiFetch<Cart>('/cart/')

export const addToCart = (skuCode: string, quantity = 1) =>
  apiFetch<Cart>('/cart/items/', {
    method: 'POST',
    body: JSON.stringify({ sku_code: skuCode, quantity }),
  })

export const updateCartItem = (id: number, quantity: number) =>
  apiFetch<Cart>(`/cart/items/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  })

export const removeCartItem = (id: number) =>
  apiFetch<Cart>(`/cart/items/${id}/`, { method: 'DELETE' })
