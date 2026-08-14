import { createErrorRequestState, createLoadingRequestState, requestService } from '../../../platforms/web-foundation/index.js';

export const contractSafeEngineeringService = {
  createState(status, payload = {}) {
    if (status === 'loading') {
      return createLoadingRequestState(payload);
    }

    if (status === 'error') {
      return createErrorRequestState(payload?.data ?? payload, payload?.error ?? 'Request failed.');
    }

    if (status === 'unauthorized') {
      return {
        status: 'unauthorized',
        data: payload?.data ?? null,
        error: payload?.error ?? 'Unauthorized request. Authentication is required.',
        updatedAt: new Date().toISOString()
      };
    }

    if (status === 'empty') {
      return {
        status: 'empty',
        data: payload?.data ?? payload ?? [],
        error: null,
        updatedAt: new Date().toISOString()
      };
    }

    return {
      status: 'success',
      data: payload?.data ?? payload,
      error: null,
      updatedAt: new Date().toISOString()
    };
  },

  async request({ url, method = 'GET', timeoutMs = 6000, headers = {}, body = null, transform = null, simulateUnauthorized = false }) {
    if (simulateUnauthorized) {
      return {
        ok: false,
        status: 401,
        data: null,
        error: 'Unauthorized request. Authentication is required.'
      };
    }

    return requestService({
      url,
      method,
      timeoutMs,
      headers,
      body,
      transform
    });
  }
};
