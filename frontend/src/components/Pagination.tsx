import { PRODUCT_PAGE_SIZE } from '../api/catalog'

// 表示するページ番号の並びを作る。多いときは … で省略する。
// 例: current=5, total=10 → [1, '…', 4, 5, 6, '…', 10]
function pageItems(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const items: (number | 'gap')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) items.push('gap')
  for (let p = start; p <= end; p++) items.push(p)
  if (end < total - 1) items.push('gap')
  items.push(total)
  return items
}

export function Pagination({
  count,
  page,
  onChange,
}: {
  count: number
  page: number
  onChange: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(count / PRODUCT_PAGE_SIZE))
  if (totalPages <= 1) return null

  const btn =
    'grid h-9 min-w-9 place-items-center rounded-lg border border-slate-300 px-3 text-sm transition hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent'

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5">
      <button
        type="button"
        className={btn}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="前のページ"
      >
        ‹
      </button>

      {pageItems(page, totalPages).map((item, i) =>
        item === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={
              item === page
                ? 'grid h-9 min-w-9 place-items-center rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white'
                : btn
            }
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        className={btn}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="次のページ"
      >
        ›
      </button>
    </nav>
  )
}
