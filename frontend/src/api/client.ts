export type ApiError = {
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
};

export function isApiError(err: unknown): err is ApiError {
  if (typeof err !== "object" || err === null) return false;
  const e = (err as { error?: unknown }).error;
  if (typeof e !== "object" || e === null) return false;
  const code = (e as { code?: unknown }).code;
  const message = (e as { message?: unknown }).message;
  return typeof code === "string" && typeof message === "string";
}

export function getApiErrorMessage(err: unknown, fallback: string) {
  return isApiError(err) ? err.error.message : fallback;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "/api/v1" : "http://localhost:5001/api/v1");

export async function apiFetch<T>(
  path: string,
  options?: { method?: string; body?: unknown; accessToken?: string | null }
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options?.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {})
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw data as ApiError;
  return data as T;
}
