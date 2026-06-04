import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'

// 「カートに入れる」ボタン。未ログインならログイン画面へ誘導する。
export function AddToCartButton({ skuCode }: { skuCode: string }) {
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
      await add(skuCode, 1)
      setAdded(true)
      // 「追加しました」を一瞬出して戻す。
      window.setTimeout(() => setAdded(false), 1500)
    } finally {
      setAdding(false)
    }
  }

  return (
    <button type="button" className="add-to-cart-btn" onClick={handleClick} disabled={adding}>
      {added ? '追加しました' : 'カートに入れる'}
    </button>
  )
}
