export async function requestService(request) {
  const controller = new AbortController();
  const timeoutMs = request.timeoutMs ?? 8000;

  const timer = setTimeout(() => controller.abort(), timeoutMs);

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
    const payload = contentType.includes('application/json') ? await response.json() : null;

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
    const message = error instanceof Error ? error.message : 'Request failed.';
    return {
      ok: false,
      status: 0,
      data: null,
      error: message
    };
  } finally {
    clearTimeout(timer);
  }
}
