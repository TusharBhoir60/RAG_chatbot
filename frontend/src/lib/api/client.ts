import { API_V1_BASE } from '@/lib/api/config';
import { getApiAccessToken } from '@/lib/api/auth';
import { ApiError, formatApiDetail } from '@/lib/api/errors';

export class ApiClient {
  static async getAuthHeaders(): Promise<HeadersInit> {
    const accessToken = await getApiAccessToken();
    if (accessToken) {
      return { Authorization: `Bearer ${accessToken}` };
    }
    return {};
  }

  static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_V1_BASE}${endpoint}`;
    
    const authHeaders = await this.getAuthHeaders();

    const headers: HeadersInit = {
      ...authHeaders,
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

  static async patch<T>(
    endpoint: string,
    data: Record<string, unknown>,
    options: RequestInit = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}
