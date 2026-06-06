// カートの状態をアプリ全体で共有する Context。
// ヘッダーのカート個数バッジと、カート画面を同じ状態に保つために使う。
// カート操作 API はすべてサーバ側カート（DB）を更新し、最新カートを返すので、
// その戻り値で state を更新する（楽観更新はしない＝シンプル）。

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { addToCart, getCart, removeCartItem, updateCartItem, type Cart } from '../api/cart'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../components/Toast'

interface CartContextValue {
  cart: Cart | null
  // 操作系は成功したかを boolean で返す（失敗時はトーストでも通知する）。
  add: (skuCode: string, quantity?: number) => Promise<boolean>
  update: (id: number, quantity: number) => Promise<boolean>
  remove: (id: number) => Promise<boolean>
  refresh: () => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { notify } = useToast()
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

  // 操作が失敗してもアプリが落ちないよう、各操作で例外を捕まえてトースト通知する。
  async function run(action: () => Promise<Cart>, failMessage: string): Promise<boolean> {
    try {
      setCart(await action())
      return true
    } catch {
      notify(failMessage, 'error')
      return false
    }
  }

  const add = (skuCode: string, quantity = 1) =>
    run(() => addToCart(skuCode, quantity), 'カートに追加できませんでした')
  const update = (id: number, quantity: number) =>
    run(() => updateCartItem(id, quantity), '数量を変更できませんでした')
  const remove = (id: number) => run(() => removeCartItem(id), '削除できませんでした')
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
