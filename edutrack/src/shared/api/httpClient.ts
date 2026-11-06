export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ?? import.meta.env.VITE_API_URL
  ?? 'http://localhost:8888/v1/api'
export const API_ORIGIN = API_BASE_URL.replace(/\/v1\/api\/?$/, '')

export const formatAvatarUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url
  }
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}

let csrfToken: string | undefined
let refreshPromise: Promise<boolean> | null = null

export class ApiError extends Error {
  public readonly status: number
  public readonly code: string
  public readonly fieldErrors?: Readonly<Record<string, string>>

  public constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors?: Readonly<Record<string, string>>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

interface ErrorResponse {
  success: false
  code: string
  message: string
  fieldErrors?: Record<string, string>
}

interface CsrfResponse {
  success: true
  data: { csrfToken: string }
}

const isErrorResponse = (value: unknown): value is ErrorResponse => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return candidate.success === false && typeof candidate.code === 'string' && typeof candidate.message === 'string'
}

const readBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') ?? ''
  return contentType.includes('application/json') ? response.json() : undefined
}

const readCsrfCookie = (): string | undefined => {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(/(?:^|;\s*)edutrack_csrf=([^;]+)/)
  const rawValue = match?.[1]
  return rawValue ? decodeURIComponent(rawValue) : undefined
}

export const ensureCsrfToken = async (force = false): Promise<string> => {
  if (!force) {
    const cookieVal = readCsrfCookie()
    if (cookieVal) {
      csrfToken = cookieVal
      return cookieVal
    }
    if (csrfToken) return csrfToken
  }

  const response = await fetch(`${API_BASE_URL}/auth/csrf`, { credentials: 'include' })
  const body: unknown = await readBody(response)
  if (!response.ok || typeof body !== 'object' || body === null || !('data' in body)) {
    throw new ApiError(response.status, 'CSRF_INITIALIZATION_FAILED', 'Không thể khởi tạo phiên bảo mật.')
  }
  csrfToken = (body as CsrfResponse).data.csrfToken
  return csrfToken
}

export const clearCsrfToken = (): void => {
  csrfToken = undefined
}

const performSilentRefresh = async (): Promise<boolean> => {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const token = await ensureCsrfToken()
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token,
        },
      })

      if (!response.ok) {
        // Nếu bị chặn 403 do CSRF cookie lệch, thử force refresh CSRF rồi gọi lại
        if (response.status === 403) {
          const freshToken = await ensureCsrfToken(true)
          const retryRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': freshToken,
            },
          })
          return retryRes.ok
        }
        return false
      }
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

const isAuthExempt = (path: string): boolean =>
  path.startsWith('/auth/login') ||
  path.startsWith('/auth/refresh') ||
  path.startsWith('/auth/register') ||
  path.startsWith('/auth/verify-registration') ||
  path.startsWith('/auth/forgot-password') ||
  path.startsWith('/auth/reset-password')

export const request = async <T>(
  path: string,
  init?: RequestInit,
  isRetry = false,
): Promise<T> => {
  const method = init?.method?.toUpperCase() ?? 'GET'
  const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  const token = needsCsrf ? await ensureCsrfToken() : undefined
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { 'x-csrf-token': token } : {}),
      ...init?.headers,
    },
  })

  // 1. Khắc phục tự động nếu CSRF token bị lệch hoặc hết hạn (403)
  if (response.status === 403 && needsCsrf && !isRetry) {
    const errorBody: unknown = await readBody(response.clone())
    if (
      isErrorResponse(errorBody) &&
      (errorBody.code === 'CSRF_TOKEN_MISSING' || errorBody.code === 'CSRF_TOKEN_INVALID')
    ) {
      await ensureCsrfToken(true)
      return request<T>(path, init, true)
    }
  }

  // 2. Silent Auto-Refresh khi Access Token hết hạn (401)
  if (response.status === 401 && !isAuthExempt(path) && !isRetry) {
    const refreshed = await performSilentRefresh()
    if (refreshed) {
      return request<T>(path, init, true)
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('edutrack:session-expired'))
    }
  }

  const body: unknown = await readBody(response)
  if (!response.ok) {
    if (isErrorResponse(body)) {
      throw new ApiError(response.status, body.code, body.message, body.fieldErrors)
    }

    throw new ApiError(response.status, 'UNKNOWN_API_ERROR', 'Không thể xử lý yêu cầu lúc này.')
  }

  return body as T
}
