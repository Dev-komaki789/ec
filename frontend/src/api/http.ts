// 共通 HTTP クライアント。
// - Authorization: Bearer <access> を自動付与
// - access が期限切れ(401)なら refresh で取り直して 1 回だけ自動リトライ
// 認証が要るエンドポイント（カート・注文・me）はこの apiFetch を通す。

import { clearTokens, getTokens, setTokens } from '../auth/tokenStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001/api/ec'

// API がエラー応答（4xx/5xx）のときに投げる例外。status と本文を持たせる。
export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown, message: string) {
    super(message)
    this.status = status
    this.body = body
  }
}

function buildHeaders(options: RequestInit, accessToken: string | null): Headers {
  const headers = new Headers(options.headers ?? {})
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  return headers
}

// access が切れていたら refresh トークンで新しい access をもらう。
async function refreshAccessToken(): Promise<string | null> {
  const { refresh } = getTokens()
  if (!refresh) return null

  const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!res.ok) {
    // refresh も無効 → 完全にログアウト状態へ。
    clearTokens()
    return null
  }
  const data = (await res.json()) as { access: string }
  setTokens({ access: data.access })
  return data.access
}

async function parseError(res: Response): Promise<never> {
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    // JSON でないエラー本文は無視。
  }
  const message =
    (body as { message?: string; detail?: string })?.message ??
    (body as { detail?: string })?.detail ??
    `HTTP ${res.status}`
  throw new ApiError(res.status, body, message)
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { access } = getTokens()
  let res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options, access),
  })

  // access 期限切れ → refresh して 1 回だけリトライ。
  if (res.status === 401 && getTokens().refresh) {
    const newAccess = await refreshAccessToken()
    if (newAccess) {
      res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: buildHeaders(options, newAccess),
      })
    }
  }

  if (!res.ok) {
    return parseError(res)
  }
  if (res.status === 204) {
    return null as T
  }
  return res.json() as Promise<T>
}
