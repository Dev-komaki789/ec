export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">
        <p className="font-semibold text-slate-700">KOMAKI EC</p>
        <p className="mt-1">
          WMS（倉庫管理システム）と API 連携する EC サイトのデモです。決済はモックで、実際の課金は行いません。
        </p>
        <p className="mt-4 text-xs text-slate-400">© 2026 KOMAKI EC (demo)</p>
      </div>
    </footer>
  )
}
