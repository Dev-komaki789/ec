// 認証 API。ログイン（トークン発行）は専用 fetch で行う（apiFetch の
// 401→refresh ロジックに巻き込まれないように）。

import { setTokens } from '../auth/tokenStore'
import { apiFetch } from './http'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001/api/ec'

export interface Me {
  email: string
  full_name: string
  postal_code: string
  address: string
  phone_number: string
}

export interface RegisterPayload {
  email: string
  password: string
  full_name: string
  postal_code?: string
  address?: string
  phone_number?: string
}

export async function register(payload: RegisterPayload): Promise<void> {
  await apiFetch('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ログイン: username=メールアドレス で token を取得し保存する（バックエンドの仕様）。
export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
  })
  if (!res.ok) {
    throw new Error('メールアドレスまたはパスワードが違います')
  }
  const data = (await res.json()) as { access: string; refresh: string }
  setTokens({ access: data.access, refresh: data.refresh })
}

export async function fetchMe(): Promise<Me> {
  return apiFetch<Me>('/auth/me/')
}

export interface ProfileUpdate {
  full_name?: string
  postal_code?: string
  address?: string
  phone_number?: string
}

export async function updateMe(payload: ProfileUpdate): Promise<Me> {
  return apiFetch<Me>('/auth/me/', { method: 'PATCH', body: JSON.stringify(payload) })
}
