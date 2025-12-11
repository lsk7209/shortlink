type FetchOptions = {
  method?: 'GET' | 'POST' | 'DELETE' | 'PATCH'
  body?: unknown
  token?: string
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  const res = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    const message = errorBody.error ?? '요청 처리 중 오류가 발생했습니다.'
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

