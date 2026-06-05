// 共通のスタイル断片（Tailwind のクラス文字列）。ボタンの見た目をここで統一する。
// コンポーネント側では className={btnPrimary} のように使う。

export const btnPrimary =
  'inline-flex items-center justify-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:bg-brand-800 disabled:cursor-default disabled:opacity-50'

export const btnOutline =
  'inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50'

export const btnGhost =
  'inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100'

// 白いカード（影＋角丸）。商品カードや各セクションの土台に使う。
export const card = 'rounded-xl border border-slate-200 bg-white shadow-sm'
