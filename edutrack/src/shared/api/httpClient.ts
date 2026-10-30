const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ?? import.meta.env.VITE_API_URL
  ?? 'http://localhost:8888/v1/api'
export const API_ORIGIN = API_BASE_URL.replace(/\/v1\/api\/?$/, '')

let csrfToken: string | undefined

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

export const ensureCsrfToken = async (): Promise<string> => {
  if (csrfToken) return csrfToken
  const response = await fetch(`${API_BASE_URL}/auth/csrf`, { credentials: 'include' })
  const body: unknown = await readBody(response)
  if (!response.ok || typeof body !== 'object' || body === null || !('data' in body)) {
    throw new ApiError(response.status, 'CSRF_INITIALIZATION_FAILED', 'Không thể khởi tạo phiên bảo mật.')
  }
  csrfToken = (body as CsrfResponse).data.csrfToken
  return csrfToken
}

export const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const method = init?.method?.toUpperCase() ?? 'GET'
  const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  const token = needsCsrf ? await ensureCsrfToken() : undefined
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-csrf-token': token } : {}),
      ...init?.headers,
    },
  })

  const body: unknown = await readBody(response)
  if (!response.ok) {
    if (isErrorResponse(body)) {
      throw new ApiError(response.status, body.code, body.message, body.fieldErrors)
    }

    throw new ApiError(response.status, 'UNKNOWN_API_ERROR', 'Không thể xử lý yêu cầu lúc này.')
  }

  return body as T
}
