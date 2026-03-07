function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function resolveApiUrl(input: string, apiBaseUrl: string): string {
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(input, base);
    if (!isApiPath(parsed.pathname)) {
      return input;
    }

    const target = new URL(apiBaseUrl);
    target.pathname = parsed.pathname;
    target.search = parsed.search;
    target.hash = parsed.hash;
    return target.toString();
  } catch {
    return input;
  }
}

export function bootstrapApiBase(): void {
  if (typeof window === "undefined") return;

  const rawApiBase = String(import.meta.env.VITE_API_BASE_URL || "");
  const apiBaseUrl = normalizeBaseUrl(rawApiBase);
  if (!apiBaseUrl) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const withApiCredentials = (requestInit?: RequestInit): RequestInit => ({
      ...(requestInit || {}),
      credentials: requestInit?.credentials ?? "include",
    });

    if (typeof input === "string") {
      const rewritten = resolveApiUrl(input, apiBaseUrl);
      const nextInit = rewritten !== input ? withApiCredentials(init) : init;
      return originalFetch(rewritten, nextInit);
    }

    if (input instanceof URL) {
      const rewritten = resolveApiUrl(input.toString(), apiBaseUrl);
      const nextInit = rewritten !== input.toString() ? withApiCredentials(init) : init;
      return originalFetch(rewritten, nextInit);
    }

    if (input instanceof Request) {
      const rewritten = resolveApiUrl(input.url, apiBaseUrl);
      if (rewritten !== input.url) {
        const rewrittenRequest = new Request(rewritten, {
          method: init?.method ?? input.method,
          headers: init?.headers ?? input.headers,
          body: init?.body ?? (input.method === "GET" || input.method === "HEAD" ? undefined : input.clone().body),
          cache: init?.cache ?? input.cache,
          credentials: init?.credentials ?? "include",
          integrity: init?.integrity ?? input.integrity,
          keepalive: init?.keepalive ?? input.keepalive,
          mode: init?.mode ?? input.mode,
          redirect: init?.redirect ?? input.redirect,
          referrer: init?.referrer ?? input.referrer,
          referrerPolicy: init?.referrerPolicy ?? input.referrerPolicy,
          signal: init?.signal ?? input.signal,
        });
        return originalFetch(rewrittenRequest);
      }
    }

    return originalFetch(input, init);
  }) as typeof window.fetch;
}
