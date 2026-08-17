/**
 * Part 4 Integration
 *
 * Session adapter: handles login, session state, logout, and protected navigation.
 * Uses the backend /api/auth endpoints.
 *
 * Contract-aware adapter that maintains session state locally while deferring to
 * the backend auth service for actual credential verification.
 */

import { contractSafeEngineeringService } from './contract-safe-service.js';

export const sessionAdapter = {
  /**
   * Local session state model
   */
  createSessionState({ token = null, user = null, expiresAt = null, isAuthenticated = false } = {}) {
    return {
      token,
      user,
      expiresAt,
      isAuthenticated
    };
  },

  /**
   * Check if session token is expired
   */
  isTokenExpired(expiresAt) {
    if (!expiresAt) return true;
    return new Date() >= new Date(expiresAt);
  },

  /**
   * Attempt login against backend auth service
   */
  async login({ email, password, backendUrl = 'http://localhost:3000' }) {
    try {
      const response = await contractSafeEngineeringService.request({
        url: `${backendUrl}/api/auth/login`,
        method: 'POST',
        body: { email, password },
        timeoutMs: 8000
      });

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: response.error || 'Login failed'
        };
      }

      const { token, user } = response.data || {};
      if (!token || !user) {
        return {
          ok: false,
          status: 400,
          error: 'Invalid response from auth service'
        };
      }

      // Assume token TTL of 1 hour from backend /api/auth/login response
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      return {
        ok: true,
        status: 200,
        data: {
          session: this.createSessionState({
            token,
            user,
            expiresAt,
            isAuthenticated: true
          }),
          user
        }
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : 'Network error during login'
      };
    }
  },

  /**
   * Verify current session is valid with backend
   */
  async verifySession({ token, backendUrl = 'http://localhost:3000' }) {
    try {
      const response = await contractSafeEngineeringService.request({
        url: `${backendUrl}/api/auth/me`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeoutMs: 6000
      });

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: response.error || 'Session verification failed'
        };
      }

      const user = response.data;
      if (!user || !user.id) {
        return {
          ok: false,
          status: 400,
          error: 'Invalid user data from session verification'
        };
      }

      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      return {
        ok: true,
        status: 200,
        data: {
          session: this.createSessionState({
            token,
            user,
            expiresAt,
            isAuthenticated: true
          }),
          user
        }
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : 'Network error during verification'
      };
    }
  },

  /**
   * Logout (clear local session; backend requires no logout endpoint)
   */
  logout() {
    return {
      ok: true,
      status: 200,
      data: {
        session: this.createSessionState()
      }
    };
  },

  /**
   * Check if protected route is accessible for current session
   */
  canAccessRoute({ route, session }) {
    if (!route.requiresAuth) return true;
    if (!session || !session.isAuthenticated) return false;
    if (this.isTokenExpired(session.expiresAt)) return false;
    return true;
  },

  /**
   * Get authorization header for authenticated requests
   */
  getAuthHeader({ session }) {
    if (!session || !session.token) return {};
    return {
      Authorization: `Bearer ${session.token}`
    };
  }
};
