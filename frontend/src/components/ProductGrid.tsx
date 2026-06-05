import { useEffect, useState } from 'react'
import { fetchProducts } from '../api/catalog'
import type { Product } from '../api/types'
import { ProductCard } from './ProductCard'

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-200" />
      ))}
    </div>
  )
}

export function ProductGrid({ category, search }: { category: string; search: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchProducts({ category, search })
        if (cancelled) return
        setProducts(data.results)
        setCount(data.count)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '読み込みに失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [category, search])

  if (loading) return <GridSkeleton />
  if (error) return <p className="text-rose-600">{error}</p>

  return (
    <>
      <p className="mb-4 text-sm text-slate-500">{count} 件</p>
      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-500">
          該当する商品がありません。
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </>
  )
}
