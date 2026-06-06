import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `py-1 transition hover:text-brand-700 ${isActive ? 'font-semibold text-brand-700' : 'text-slate-600'}`

export function Header() {
  const { user, logout } = useAuth()
  const { cart } = useCart()
  const cartCount = cart?.total_quantity ?? 0
  const [menuOpen, setMenuOpen] = useState(false)
  const close = () => setMenuOpen(false)

  // PC・モバイル共通で使い回すリンク群。
  const links = (
    <>
      <NavLink to="/" className={navClass} end onClick={close}>
        商品一覧
      </NavLink>
      {user ? (
        <>
          <NavLink to="/cart" className={navClass} onClick={close}>
            <span className="relative">
              カート
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-4 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </span>
          </NavLink>
          <NavLink to="/orders" className={navClass} onClick={close}>
            注文履歴
          </NavLink>
          <NavLink to="/profile" className={navClass} onClick={close}>
            {user.full_name} さん
          </NavLink>
          <button
            type="button"
            onClick={() => {
              close()
              logout()
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-left text-slate-600 transition hover:bg-slate-50"
          >
            ログアウト
          </button>
        </>
      ) : (
        <Link
          to="/login"
          onClick={close}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-center font-medium text-white transition hover:bg-brand-700"
        >
          ログイン / 新規登録
        </Link>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          to="/"
          onClick={close}
          className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
            K
          </span>
          KOMAKI EC
        </Link>

        {/* PC: 横並びナビ */}
        <nav className="hidden items-center gap-5 text-sm md:flex">{links}</nav>

        {/* モバイル: ハンバーガーボタン */}
        <button
          type="button"
          className="text-slate-700 md:hidden"
          aria-label="メニュー"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* モバイル: 開いたときのメニュー（縦並び） */}
      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-slate-200 bg-white px-4 py-3 text-sm md:hidden">
          {links}
        </nav>
      )}
    </header>
  )
}
