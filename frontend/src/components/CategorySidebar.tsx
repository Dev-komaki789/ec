import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchCategories } from '../api/catalog'
import type { Category } from '../api/types'

interface Node extends Category {
  children: Node[]
}

// フラットなカテゴリ配列を parent_id で木構造に組み立てる。
function buildTree(cats: Category[]): Node[] {
  const byId = new Map<number, Node>()
  cats.forEach((c) => byId.set(c.id, { ...c, children: [] }))

  const roots: Node[] = []
  byId.forEach((node) => {
    if (node.parent_id != null && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  const sortRec = (nodes: Node[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.category_code.localeCompare(b.category_code))
    nodes.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

function linkClass(isActive: boolean): string {
  return `block rounded-md py-1.5 pr-2 transition ${
    isActive ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-600 hover:bg-slate-100'
  }`
}

function CategoryNode({ node, depth, active }: { node: Node; depth: number; active: string }) {
  return (
    <li>
      <Link
        to={`/?category=${node.category_code}`}
        className={linkClass(active === node.category_code)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.category_name}
      </Link>
      {node.children.length > 0 && (
        <ul className="space-y-0.5">
          {node.children.map((c) => (
            <CategoryNode key={c.id} node={c} depth={depth + 1} active={active} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function CategorySidebar({ onNavigate }: { onNavigate?: () => void }) {
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

  const tree = buildTree(cats)

  return (
    // カテゴリのリンクをクリックしたら（モバイルのドロワーを）閉じる。
    // どのリンクを押してもバブリングでここに届くので onClick 一箇所でまとめて扱う。
    <nav className="text-sm" onClick={() => onNavigate?.()}>
      <h2 className="mb-2 px-2 text-xs font-bold tracking-wide text-slate-400 uppercase">カテゴリ</h2>
      <ul className="space-y-0.5">
        <li>
          <Link to="/" className={linkClass(active === '')} style={{ paddingLeft: '8px' }}>
            すべての商品
          </Link>
        </li>
        {tree.map((node) => (
          <CategoryNode key={node.id} node={node} depth={0} active={active} />
        ))}
      </ul>
    </nav>
  )
}
