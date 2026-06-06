import { useSearchParams } from 'react-router-dom'
import { CategorySidebar } from '../components/CategorySidebar'
import { ProductGrid } from '../components/ProductGrid'
import { btnPrimary } from '../components/ui'

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category') ?? ''
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const term = new FormData(e.currentTarget).get('q')?.toString().trim() ?? ''
    const next = new URLSearchParams(searchParams)
    if (term) next.set('search', term)
    else next.delete('search')
    next.delete('page') // 検索条件が変わったら 1 ページ目に戻す
    setSearchParams(next)
  }

  function changePage(p: number) {
    const next = new URLSearchParams(searchParams)
    if (p > 1) next.set('page', String(p))
    else next.delete('page')
    setSearchParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <CategorySidebar />
      </aside>

      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900">商品一覧</h1>
          {/* key={search} で、カテゴリ変更などで URL の search が消えたら入力欄もリセットする */}
          <form onSubmit={submitSearch} className="flex gap-2">
            <input
              key={search}
              name="q"
              type="search"
              defaultValue={search}
              placeholder="商品名・コードで検索"
              className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
            <button type="submit" className={btnPrimary}>
              検索
            </button>
          </form>
        </div>

        <ProductGrid category={category} search={search} page={page} onPageChange={changePage} />
      </div>
    </div>
  )
}
