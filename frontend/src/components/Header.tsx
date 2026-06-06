import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `transition hover:text-brand-700 ${isActive ? 'font-semibold text-brand-700' : 'text-slate-600'}`

export function Header() {
  const { user, logout } = useAuth()
  const { cart } = useCart()
  const cartCount = cart?.total_quantity ?? 0

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
            K
          </span>
          KOMAKI EC
        </Link>

        {/* PC のみ横並びナビ。スマホは下部の BottomNav を使う。 */}
        <nav className="hidden items-center gap-5 text-sm md:flex">
          <NavLink to="/" className={navClass} end>
            商品一覧
          </NavLink>
          {user ? (
            <>
              <NavLink to="/cart" className={navClass}>
                <span className="relative">
                  カート
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-4 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {cartCount}
                    </span>
                  )}
                </span>
              </NavLink>
              <NavLink to="/orders" className={navClass}>
                注文履歴
              </NavLink>
              <NavLink to="/profile" className={navClass}>
                マイページ
              </NavLink>
              <button
                type="button"
                onClick={logout}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 transition hover:bg-slate-50"
              >
                ログアウト
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white transition hover:bg-brand-700"
            >
              ログイン / 新規登録
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
