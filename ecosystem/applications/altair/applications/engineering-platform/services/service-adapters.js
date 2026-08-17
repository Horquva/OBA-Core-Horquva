/**
 * Part 4 Service Integration
 *
 * Adapters for available backend services and contract-safe mocks for unavailable services.
 *
 * These adapters follow the Mock → Adapter → Contract → Integration Readiness pattern:
 * - Real services are integrated through dedicated adapter functions
 * - Unavailable services use contract-safe mocks
 * - All error states are handled uniformly
 */

import { contractSafeEngineeringService } from './contract-safe-service.js';
import { mockData } from '../data/mock-data.js';

/**
 * Dashboard service adapter
 * Integrates with: /api/dashboard
 * Status: REAL INTEGRATION
 */
export const dashboardServiceAdapter = {
  async fetchDashboardData({ token, backendUrl = 'http://localhost:3000', useMock = false }) {
    if (useMock) {
      return contractSafeEngineeringService.createState('success', {
        data: {
          summaryCards: mockData.summaryCards,
          projectStatus: mockData.projectStatus,
          notifications: mockData.notifications,
          activity: mockData.activity
        }
      });
    }

    try {
      const response = await contractSafeEngineeringService.request({
        url: `${backendUrl}/api/dashboard`,
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeoutMs: 8000
      });

      if (!response.ok) {
        if (response.status === 401) {
          return contractSafeEngineeringService.createState('unauthorized', {
            error: 'Dashboard access requires authentication'
          });
        }
        return contractSafeEngineeringService.createState('error', {
          error: response.error || 'Failed to fetch dashboard data'
        });
      }

      if (!response.data) {
        return contractSafeEngineeringService.createState('empty', {});
      }

      return contractSafeEngineeringService.createState('success', {
        data: response.data
      });
    } catch (error) {
      return contractSafeEngineeringService.createState('error', {
        error: error instanceof Error ? error.message : 'Network error'
      });
    }
  }
};

/**
 * Knowledge service adapter
 * Integrates with: /api/knowledge/intelligence
 * Status: CONTRACT-READY (API available, using mock for now)
 */
export const knowledgeServiceAdapter = {
  async fetchKnowledge({ token, query = '', category = 'all', backendUrl = 'http://localhost:3000', useMock = true }) {
    if (useMock) {
      const items = mockData.knowledge;
      const filtered = items.filter((item) => {
        const matchesCategory = category === 'all' || item.category === category;
        const matchesQuery = !query || `${item.title} ${item.summary}`.toLowerCase().includes(query.toLowerCase());
        return matchesCategory && matchesQuery;
      });

      return contractSafeEngineeringService.createState(filtered.length ? 'success' : 'empty', {
        data: { items: filtered, categories: ['all', 'engineering', 'security', 'governance', 'design'] }
      });
    }

    try {
      const url = new URL(`${backendUrl}/api/knowledge/intelligence`);
      if (query) url.searchParams.append('q', query);
      if (category !== 'all') url.searchParams.append('category', category);

      const response = await contractSafeEngineeringService.request({
        url: url.toString(),
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeoutMs: 8000
      });

      if (!response.ok) {
        if (response.status === 401) {
          return contractSafeEngineeringService.createState('unauthorized', {
            error: 'Knowledge access requires authentication'
          });
        }
        return contractSafeEngineeringService.createState('error', {
          error: response.error || 'Failed to fetch knowledge'
        });
      }

      if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
        return contractSafeEngineeringService.createState('empty', {});
      }

      return contractSafeEngineeringService.createState('success', {
        data: { items: Array.isArray(response.data) ? response.data : [response.data] }
      });
    } catch (error) {
      return contractSafeEngineeringService.createState('error', {
        error: error instanceof Error ? error.message : 'Network error'
      });
    }
  }
};

/**
 * Workflows service adapter
 * Integrates with: /api/workflows
 * Status: REAL INTEGRATION (used for projects in this context)
 */
export const workflowsServiceAdapter = {
  async fetchWorkflows({ token, backendUrl = 'http://localhost:3000', useMock = false }) {
    if (useMock) {
      return contractSafeEngineeringService.createState('success', {
        data: {
          workflows: mockData.workflows,
          projects: mockData.projects
        }
      });
    }

    try {
      const response = await contractSafeEngineeringService.request({
        url: `${backendUrl}/api/workflows`,
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeoutMs: 8000
      });

      if (!response.ok) {
        if (response.status === 401) {
          return contractSafeEngineeringService.createState('unauthorized', {
            error: 'Workflows access requires authentication'
          });
        }
        return contractSafeEngineeringService.createState('error', {
          error: response.error || 'Failed to fetch workflows'
        });
      }

      if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
        return contractSafeEngineeringService.createState('empty', { data: { workflows: [] } });
      }

      return contractSafeEngineeringService.createState('success', {
        data: {
          workflows: Array.isArray(response.data) ? response.data : [response.data],
          projects: mockData.projects
        }
      });
    } catch (error) {
      return contractSafeEngineeringService.createState('error', {
        error: error instanceof Error ? error.message : 'Network error'
      });
    }
  }
};

/**
 * Notifications service adapter
 * Status: MOCK / CONTRACT-READY
 *
 * REASON: No dedicated notifications endpoint in backend.
 * FUTURE: Could be built from verification, orchestration, or dedicated notification service.
 * CONTRACT: Notifications remain as contract-safe mock until upstream service is available.
 */
export const notificationsServiceAdapter = {
  async fetchNotifications({ token, backendUrl = 'http://localhost:3000', useMock = true }) {
    // Currently only mock implementation; no backend notifications service mapped
    if (useMock) {
      const items = mockData.notifications;
      return contractSafeEngineeringService.createState(items.length ? 'success' : 'empty', {
        data: { items, unreadCount: items.filter((n) => !n.read).length }
      });
    }

    return contractSafeEngineeringService.createState('error', {
      error: 'Notifications service not yet configured'
    });
  },

  async markAsRead({ notificationId, token, backendUrl = 'http://localhost:3000' }) {
    // Mock implementation for now
    return contractSafeEngineeringService.createState('success', {
      data: { notificationId, read: true }
    });
  }
};

/**
 * Activity service adapter
 * Status: MOCK / CONTRACT-READY
 *
 * REASON: No dedicated activity endpoint; could come from verification or audit logs.
 * FUTURE: Integrate with audit trail or verification API once available.
 */
export const activityServiceAdapter = {
  async fetchActivity({ token, backendUrl = 'http://localhost:3000', useMock = true }) {
    if (useMock) {
      const items = mockData.activity;
      return contractSafeEngineeringService.createState(items.length ? 'success' : 'empty', {
        data: { items }
      });
    }

    return contractSafeEngineeringService.createState('error', {
      error: 'Activity service not yet configured'
    });
  }
};

/**
 * Projects service adapter
 * Status: REPRESENTED via workflows / mock
 *
 * REASON: No dedicated projects endpoint; projects are represented through workflows
 * and organizational intelligence. Using mock data for now.
 * FUTURE: Could map to ownership/accountability layer or dedicated projects service.
 */
export const projectsServiceAdapter = {
  async fetchProjects({ token, backendUrl = 'http://localhost:3000', useMock = true }) {
    if (useMock) {
      const items = mockData.projects;
      return contractSafeEngineeringService.createState(items.length ? 'success' : 'empty', {
        data: { items }
      });
    }

    // Future: Could query /api/workflows or other endpoints
    return contractSafeEngineeringService.createState('error', {
      error: 'Projects service not yet configured'
    });
  }
};
