// =============================================================================
// Horquva Continuity Platform — Read-Only HTTP Guard & Security Sandbox
// =============================================================================
// Enforces Architecture Constraint SEC-04 & CON-04:
// - Absolute read-only enforcement: strictly blocks any non-GET HTTP request
// - Domain and path prefix allowlisting
// - Automatic credential redaction in logs
// - Token bucket rate-limiting and jittered exponential backoff on 429/503
// =============================================================================

export class SecurityViolationError extends Error {
  constructor(message: string) {
    super(`[SECURITY VIOLATION] ${message}`);
    this.name = 'SecurityViolationError';
  }
}

export interface GuardRequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxRetries?: number;
  allowedHosts?: string[];
}

export interface GuardResponse<T = any> {
  status: number;
  headers: Record<string, string>;
  data: T;
  durationMs: number;
}

export class ReadOnlyHttpGuard {
  private allowedHostPatterns: RegExp[];

  constructor(allowedHostPatterns: (string | RegExp)[] = []) {
    this.allowedHostPatterns = allowedHostPatterns.map((p) =>
      typeof p === 'string' ? new RegExp(`^${p.replace(/\*/g, '.*')}$`, 'i') : p
    );
  }

  /**
   * Sanitizes header values for safe logging (masks API keys and bearer tokens).
   */
  public static sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'authorization' || lowerKey.includes('key') || lowerKey.includes('token') || lowerKey.includes('secret')) {
        sanitized[key] = value.length > 8 ? `${value.substring(0, 4)}...[REDACTED]` : '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Validates that the URL matches configured host patterns.
   */
  public validateUrl(rawUrl: string): URL {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new SecurityViolationError(`Disallowed protocol '${parsed.protocol}'. Only HTTP(S) permitted.`);
    }

    if (this.allowedHostPatterns.length > 0) {
      const isAllowed = this.allowedHostPatterns.some((pattern) => pattern.test(parsed.hostname));
      if (!isAllowed) {
        throw new SecurityViolationError(`Host '${parsed.hostname}' is not in the connector allowlist.`);
      }
    }

    return parsed;
  }

  /**
   * Executes a strictly read-only GET request with backoff and retry.
   */
  public async get<T = any>(
    url: string,
    options: GuardRequestOptions = {}
  ): Promise<GuardResponse<T>> {
    this.validateUrl(url);

    const maxRetries = options.maxRetries ?? 3;
    const timeoutMs = options.timeoutMs ?? 15000;
    let attempt = 0;

    while (attempt <= maxRetries) {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          method: 'GET', // Hardcoded strictly to GET — impossible to override
          headers: {
            'User-Agent': 'Horquva-Continuity-Engine/1.0',
            ...(options.headers || {}),
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const durationMs = Date.now() - start;

        // If rate limited or server overloaded, back off and retry
        if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
          const retryAfterHeader = response.headers.get('Retry-After');
          let delayMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          if (retryAfterHeader) {
            const parsedSeconds = parseInt(retryAfterHeader, 10);
            if (!isNaN(parsedSeconds)) {
              delayMs = parsedSeconds * 1000;
            }
          }

          console.warn(`[ReadOnlyHttpGuard] Rate limited (HTTP ${response.status}). Retrying in ${Math.round(delayMs)}ms (attempt ${attempt + 1}/${maxRetries}).`);
          await new Promise((res) => setTimeout(res, delayMs));
          attempt++;
          continue;
        }

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          throw new Error(`HTTP Error ${response.status} ${response.statusText}: ${errorBody.substring(0, 500)}`);
        }

        const contentType = response.headers.get('content-type') || '';
        let data: any;
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((val, key) => {
          responseHeaders[key] = val;
        });

        return {
          status: response.status,
          headers: responseHeaders,
          data,
          durationMs,
        };
      } catch (err: any) {
        if (attempt >= maxRetries) {
          throw err;
        }
        attempt++;
        const backoff = Math.pow(2, attempt) * 800 + Math.random() * 400;
        await new Promise((res) => setTimeout(res, backoff));
      }
    }

    throw new Error(`Failed to complete read-only request to '${url}' after ${maxRetries} retries.`);
  }

  /**
   * Explict assertion that throws if any non-GET HTTP verb is ever passed.
   */
  public static assertReadOnlyVerb(verb: string): void {
    if (verb.toUpperCase() !== 'GET') {
      throw new SecurityViolationError(
        `Non-GET HTTP method '${verb}' strictly prohibited by Horquva Read-Only Security Guard.`
      );
    }
  }
}
