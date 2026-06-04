import { useEffect, useState } from 'react'
import { fetchProducts } from '../api/catalog'
import type { Product } from '../api/types'
import { ProductCard } from './ProductCard'

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 検索ボックスの入力値と、実際に送信した検索語を分けて持つ
  //（入力のたびに API を叩かず、submit したときだけ取得する）。
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    // 再取得が走ったとき、古いリクエストの結果を捨てるためのフラグ。
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchProducts({ search })
        if (cancelled) return
        setProducts(data.results)
        setCount(data.count)
      } catch (e: unknown) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : '不明なエラー')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [search])

  return (
    <div className="product-list">
      <header className="product-list__header">
        <h1>商品一覧</h1>
        <form
          className="product-list__search"
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(searchInput.trim())
          }}
        >
          <input
            type="search"
            placeholder="商品名・商品コードで検索"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit">検索</button>
        </form>
      </header>

      {loading && <p className="product-list__status">読み込み中…</p>}
      {error && <p className="product-list__status product-list__status--error">{error}</p>}

      {!loading && !error && (
        <>
          <p className="product-list__count">{count} 件</p>
          {products.length === 0 ? (
            <p className="product-list__status">該当する商品がありません。</p>
          ) : (
            <div className="product-grid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
