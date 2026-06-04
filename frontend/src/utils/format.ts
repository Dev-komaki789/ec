// 表示用フォーマッタ。

const yen = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
})

export function formatYen(value: number): string {
  return yen.format(value)
}
