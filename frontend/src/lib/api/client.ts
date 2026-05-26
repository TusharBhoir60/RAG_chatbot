import { API_V1_BASE } from '@/lib/api/config';
import { getApiAccessToken, clearApiAccessToken } from '@/lib/api/auth';
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
    options: RequestInit = {},
    isRetry = false
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

    let response = await fetch(url, { ...options, headers });

    // Handle 401 with retry logic
    if (response.status === 401 && !isRetry) {
      clearApiAccessToken();
      // Wait for a fresh token
      await getApiAccessToken();
      // Retry once
      return this.request<T>(endpoint, options, true);
    }

    if (response.status === 401 && isRetry) {
      // Global fail graceful fallback
      clearApiAccessToken();
      if (typeof window !== 'undefined') {
        const errorMsg = 'Session expired. Please log in again.';
        // use custom event so AppProviders or anywhere can pick it up for toast
        window.dispatchEvent(new CustomEvent('auth-expired', { detail: errorMsg }));
      }
      throw new ApiError(response.status, 'Session expired.');
    }

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
