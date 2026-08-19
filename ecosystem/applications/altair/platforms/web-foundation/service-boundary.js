export async function requestService(request) {
  const controller = new AbortController();
  const timeoutMs = request.timeoutMs ?? 8000;
  let timedOut = false;
  let removeAbortListener = null;

  if (request.signal) {
    if (request.signal.aborted) {
      controller.abort(request.signal.reason);
    } else {
      const forwardAbort = () => controller.abort(request.signal.reason);
      request.signal.addEventListener('abort', forwardAbort, { once: true });
      removeAbortListener = () => request.signal.removeEventListener('abort', forwardAbort);
    }
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers ?? {})
      },
      body: request.body ? JSON.stringify(request.body) : undefined,
      signal: request.signal ?? controller.signal
    });

    const contentType = response.headers.get('content-type') ?? '';
    let payload = null;

    if (contentType.includes('application/json') && response.status !== 204) {
      const rawPayload = typeof response.text === 'function'
        ? await response.text()
        : JSON.stringify(await response.json());

      if (rawPayload) {
        try {
          payload = JSON.parse(rawPayload);
        } catch {
          return {
            ok: false,
            status: response.status,
            data: null,
            error: 'Invalid JSON response.'
          };
        }
      }
    }

    if (response.status === 401) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error: 'Unauthorized request. Authentication is required.'
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error: payload?.message ?? 'Request failed.'
      };
    }

    const transformed = request.transform ? request.transform(payload) : payload;

    return {
      ok: true,
      status: response.status,
      data: transformed,
      error: null
    };
  } catch (error) {
    const message = timedOut
      ? 'Request timed out.'
      : error instanceof Error && error.name === 'AbortError'
        ? 'Request cancelled.'
        : error instanceof Error
          ? error.message
          : 'Request failed.';
    return {
      ok: false,
      status: timedOut ? 408 : 0,
      data: null,
      error: message
    };
  } finally {
    clearTimeout(timer);
    removeAbortListener?.();
  }
}
