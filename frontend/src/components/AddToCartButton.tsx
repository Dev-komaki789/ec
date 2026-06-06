import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { btnPrimary } from './ui'

// 「カートに入れる」ボタン。未ログインならログイン画面へ誘導する。
export function AddToCartButton({
  skuCode,
  quantity = 1,
  block = false,
  disabled = false,
}: {
  skuCode: string
  quantity?: number
  block?: boolean
  disabled?: boolean
}) {
  const { user } = useAuth()
  const { add } = useCart()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  async function handleClick() {
    if (!user) {
      navigate('/login')
      return
    }
    setAdding(true)
    try {
      const ok = await add(skuCode, quantity)
      if (ok) {
        // 成功時だけ「追加しました」を出す（失敗時は CartContext がトースト通知）。
        setAdded(true)
        window.setTimeout(() => setAdded(false), 1500)
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={adding || disabled}
      className={`${btnPrimary} ${block ? 'w-full' : ''}`}
    >
      {added ? '✓ 追加しました' : adding ? '追加中…' : 'カートに入れる'}
    </button>
  )
}
