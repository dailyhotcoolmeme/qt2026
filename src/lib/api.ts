// Cloudflare Workers API 래퍼

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? ''

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  token?: string
  params?: Record<string, string | number | boolean>
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, params } = options

  let url = `${BASE_URL}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams(
      Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
        acc[k] = String(v)
        return acc
      }, {}),
    )
    url += `?${searchParams.toString()}`
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal as unknown as RequestInit['signal'],
    })
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error((error as { message?: string }).message ?? `HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const api = {
  // Daily Word
  getDailyWord: (date: string) =>
    request<{ data: unknown }>(`/daily-word`, { params: { date } }),

  // Bible Audio
  getBibleAudioUrl: (book: string, chapter: number) =>
    request<{ url: string }>(`/bible/audio`, { params: { book, chapter } }),

  // R2 업로드 (signed URL)
  getUploadUrl: (key: string, contentType: string, token: string) =>
    request<{ uploadUrl: string; publicUrl: string }>('/upload/signed-url', {
      method: 'POST',
      body: { key, contentType },
      token,
    }),
}
