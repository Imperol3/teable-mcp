export class TeableError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "TeableError";
  }
}

export interface TeableConfig {
  apiKey: string;
  baseUrl: string;
}

export class TeableClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: TeableConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean | undefined | string[]>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined) continue;
        if (Array.isArray(v)) {
          // Repeated params: ?recordIds=rec1&recordIds=rec2
          for (const item of v) url.searchParams.append(k, item);
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url.toString(), init);

    if (!res.ok) {
      let detail = "";
      try {
        const err = (await res.json()) as { message?: string; code?: string };
        detail = err.message ?? JSON.stringify(err);
      } catch {
        detail = await res.text();
      }
      throw new TeableError(
        `Teable API error ${res.status}: ${detail}`,
        res.status,
      );
    }

    // Bug fix: Teable returns 204 OR 200 with empty body on deletes/updates.
    // Guard both cases — attempt JSON parse only if there is actual content.
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text.trim()) return undefined as T;
    return JSON.parse(text) as T;
  }

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined | string[]>): Promise<T> {
    return this.request<T>("GET", path, undefined, params);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  delete<T>(path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined | string[]>): Promise<T> {
    return this.request<T>("DELETE", path, body, params);
  }
}
