// カートの状態をアプリ全体で共有する Context。
// ヘッダーのカート個数バッジと、カート画面を同じ状態に保つために使う。
// カート操作 API はすべてサーバ側カート（DB）を更新し、最新カートを返すので、
// その戻り値で state を更新する（楽観更新はしない＝シンプル）。

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { addToCart, getCart, removeCartItem, updateCartItem, type Cart } from '../api/cart'
import { useAuth } from '../auth/AuthContext'

interface CartContextValue {
  cart: Cart | null
  add: (skuCode: string, quantity?: number) => Promise<void>
  update: (id: number, quantity: number) => Promise<void>
  remove: (id: number) => Promise<void>
  refresh: () => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [cart, setCart] = useState<Cart | null>(null)

  // ログイン状態が変わったらカートを読み直す（ログアウトで空に）。
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) {
        setCart(null)
        return
      }
      try {
        const c = await getCart()
        if (!cancelled) setCart(c)
      } catch {
        // 取得失敗時は黙ってスキップ（次の操作で再取得される）。
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user])

  const add = async (skuCode: string, quantity = 1) => setCart(await addToCart(skuCode, quantity))
  const update = async (id: number, quantity: number) => setCart(await updateCartItem(id, quantity))
  const remove = async (id: number) => setCart(await removeCartItem(id))
  const refresh = async () => setCart(await getCart())

  return (
    <CartContext.Provider value={{ cart, add, update, remove, refresh }}>
      {children}
    </CartContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart は CartProvider の中で使ってください')
  return ctx
}
