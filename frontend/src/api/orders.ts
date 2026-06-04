// 注文 API。すべて認証必須。

import { apiFetch } from './http'

export interface OrderItem {
  sku_code: string
  product_name: string
  size_info: string
  color_info: string
  unit_price: number
  quantity: number
  line_total: number
}

export interface Order {
  id: number
  order_number: string
  status: string
  delivery_name: string
  delivery_postal_code: string
  delivery_address: string
  total_amount: number
  note: string
  wms_outbound_order_code: string
  wms_status: string
  created_at: string
  items: OrderItem[]
}

export interface CreateOrderPayload {
  delivery_name?: string
  delivery_postal_code?: string
  delivery_address?: string
  note?: string
}

// 注文確定。カートの内容で注文を作り、WMS に出荷指示を出す。
// 在庫不足なら ApiError(status=409) が投げられる（http.ts 参照）。
export const createOrder = (payload: CreateOrderPayload = {}) =>
  apiFetch<Order>('/orders/', { method: 'POST', body: JSON.stringify(payload) })

export const getOrders = () => apiFetch<Order[]>('/orders/')

export const getOrder = (id: number | string) => apiFetch<Order>(`/orders/${id}/`)
