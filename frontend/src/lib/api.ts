import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders, ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message ?? 'Request failed')
  }
  return res.json()
}

export const api = {
  get:    <T>(path: string, init?: RequestInit) => request<T>(path, { method: 'GET', ...init }),
  post:   <T>(path: string, body: unknown, init?: RequestInit) => request<T>(path, { method: 'POST', body: JSON.stringify(body), ...init }),
  put:    <T>(path: string, body: unknown, init?: RequestInit) => request<T>(path, { method: 'PUT', body: JSON.stringify(body), ...init }),
  patch:  <T>(path: string, body: unknown, init?: RequestInit) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...init }),
  delete: <T>(path: string, init?: RequestInit) => request<T>(path, { method: 'DELETE', ...init }),
}
