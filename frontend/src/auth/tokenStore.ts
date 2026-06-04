// JWT（access / refresh）の保管。MVP では localStorage に置く。
//
// トレードオフ: localStorage は実装が簡単だが XSS で読まれうる。より堅くするなら
// httpOnly Cookie に置く手もある（その場合はバックエンド側で Cookie 発行・CSRF 対応が要る）。
// 学習プロジェクトの MVP では localStorage を採用し、本番強化時に再検討する。

const ACCESS_KEY = 'ec_access_token'
const REFRESH_KEY = 'ec_refresh_token'

export interface Tokens {
  access: string | null
  refresh: string | null
}

export function getTokens(): Tokens {
  return {
    access: localStorage.getItem(ACCESS_KEY),
    refresh: localStorage.getItem(REFRESH_KEY),
  }
}

export function setTokens(tokens: { access?: string; refresh?: string }): void {
  if (tokens.access) localStorage.setItem(ACCESS_KEY, tokens.access)
  if (tokens.refresh) localStorage.setItem(REFRESH_KEY, tokens.refresh)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}
