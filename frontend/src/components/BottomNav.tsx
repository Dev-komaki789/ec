import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'

// スマホ用の下部ナビ（親指で届く位置に主要動線を置く＝モバイル EC の定番）。
// md 以上では非表示（PC はヘッダーの横並びナビを使う）。

const itemClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition ${
    isActive ? 'text-brand-700' : 'text-slate-500'
  }`

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  )
}

// アイコンのパス（lucide 風のシンプルな線画）
const ICON = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5',
  cart: 'M3 3h2l2.4 12.4a1 1 0 0 0 1 .8h8.5a1 1 0 0 0 1-.8L21 7H6M9 21h.01M17 21h.01',
  orders: 'M8 3h8a2 2 0 0 1 2 2v15l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2zM9 8h6M9 12h6',
  user: 'M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
}

export function BottomNav() {
  const { user } = useAuth()
  const { cart } = useCart()
  const cartCount = cart?.total_quantity ?? 0

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      <NavLink to="/" className={itemClass} end>
        <Icon d={ICON.home} />
        ホーム
      </NavLink>

      <NavLink to="/cart" className={itemClass}>
        <span className="relative">
          <Icon d={ICON.cart} />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {cartCount}
            </span>
          )}
        </span>
        カート
      </NavLink>

      <NavLink to="/orders" className={itemClass}>
        <Icon d={ICON.orders} />
        注文履歴
      </NavLink>

      <NavLink to={user ? '/profile' : '/login'} className={itemClass}>
        <Icon d={ICON.user} />
        {user ? 'アカウント' : 'ログイン'}
      </NavLink>
    </nav>
  )
}
