import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchCategories } from '../api/catalog'
import type { Category } from '../api/types'

// 横スクロールのカテゴリチップ。スマホでスワイプして選べる（サイドバーの代替）。
// 1段目: すべて + 大カテゴリ。大カテゴリを選ぶと 2段目にその中カテゴリが出る。

function chipClass(active: boolean): string {
  return `inline-flex shrink-0 items-center rounded-full border px-4 py-1.5 text-sm transition ${
    active
      ? 'border-brand-600 bg-brand-600 font-medium text-white'
      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
  }`
}

export function CategoryChips() {
  const [cats, setCats] = useState<Category[]>([])
  const [searchParams] = useSearchParams()
  const active = searchParams.get('category') ?? ''

  useEffect(() => {
    let cancelled = false
    fetchCategories()
      .then((d) => {
        if (!cancelled) setCats(d)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const roots = cats
    .filter((c) => c.parent_id == null)
    .sort((a, b) => a.sort_order - b.sort_order || a.category_code.localeCompare(b.category_code))

  // 選択中カテゴリが属する大カテゴリ（= 2段目に出す子の親）を求める。
  const activeCat = cats.find((c) => c.category_code === active)
  const activeRootId = activeCat ? (activeCat.parent_id ?? activeCat.id) : null
  const children = cats
    .filter((c) => c.parent_id === activeRootId)
    .sort((a, b) => a.sort_order - b.sort_order || a.category_code.localeCompare(b.category_code))

  return (
    <div className="mb-6 space-y-2">
      {/* 1段目: 大カテゴリ */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Link to="/" className={chipClass(active === '')}>
          すべて
        </Link>
        {roots.map((c) => {
          const isActiveBranch = c.id === activeRootId
          return (
            <Link
              key={c.id}
              to={`/?category=${c.category_code}`}
              className={chipClass(active === c.category_code || isActiveBranch)}
            >
              {c.category_name}
            </Link>
          )
        })}
      </div>

      {/* 2段目: 選択中の大カテゴリの中カテゴリ */}
      {children.length > 0 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {children.map((c) => (
            <Link
              key={c.id}
              to={`/?category=${c.category_code}`}
              className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs transition ${
                active === c.category_code
                  ? 'bg-brand-100 font-medium text-brand-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {c.category_name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
