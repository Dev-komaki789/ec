import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'

// 画面上部のヘッダー兼ナビ。ログイン状態で表示を切り替える。
export function Header() {
  const { user, logout } = useAuth()
  const { cart } = useCart()
  const cartCount = cart?.total_quantity ?? 0

  return (
    <header className="site-header">
      <Link to="/" className="site-header__logo">
        KOMAKI EC
      </Link>
      <nav className="site-header__nav">
        <Link to="/">商品一覧</Link>
        {user ? (
          <>
            <Link to="/cart">カート{cartCount > 0 && <span className="cart-badge">{cartCount}</span>}</Link>
            <Link to="/orders">注文履歴</Link>
            <span className="site-header__user">{user.full_name} さん</span>
            <button type="button" onClick={logout}>
              ログアウト
            </button>
          </>
        ) : (
          <Link to="/login">ログイン / 新規登録</Link>
        )}
      </nav>
    </header>
  )
}
