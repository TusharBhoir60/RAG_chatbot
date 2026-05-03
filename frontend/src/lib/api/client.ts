import { ApiError, formatApiDetail } from '@/lib/api/errors';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export class ApiClient {
  static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: HeadersInit = {
      ...options.headers,
    };

    const headerRecord = headers as Record<string, string>;
    if (
      !('Content-Type' in headerRecord) &&
      !(options.body instanceof FormData)
    ) {
      headerRecord['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let detail: unknown;
      try {
        const errorData: unknown = await response.json();
        if (
          errorData !== null &&
          typeof errorData === 'object' &&
          'detail' in errorData
        ) {
          detail = (errorData as { detail: unknown }).detail;
        } else {
          detail = errorData;
        }
      } catch {
        detail = response.statusText;
      }
      const message = formatApiDetail(detail);
      throw new ApiError(response.status, message);
    }

    return response.json() as Promise<T>;
  }

  static async post<T>(
    endpoint: string,
    data: FormData | Record<string, unknown>,
    options: RequestInit = {}
  ): Promise<T> {
    const isFormData = data instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
    });
  }

  static async get<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  static async delete<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}
