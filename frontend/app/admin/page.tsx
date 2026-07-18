'use client';

import { useState, useEffect, useCallback } from 'react';
import { pingEndpoint } from '../../lib/api';
import { AdminHeader } from '../../components/admin/AdminHeader';
import {
  EndpointHealthGrid,
  ROUTE_REGISTRY,
  type HealthCheckResult,
} from '../../components/admin/EndpointHealthGrid';
import { DataFreshnessTable } from '../../components/admin/DataFreshnessTable';
import { AutomationModeControl } from '../../components/admin/AutomationModeControl';

export default function AdminPage() {
  const [results, setResults] = useState<HealthCheckResult[]>(() =>
    ROUTE_REGISTRY.map(route => ({
      route,
      status: route.disabled ? 'DISABLED' : (route.requiresParam ? 'REQUIRES_PARAM' : (route.mounted ? 'CHECKING' : 'NOT_MOUNTED')),
      latencyMs: 0,
      checkedAt: null,
    })),
  );
  const [isLoading, setIsLoading] = useState(true);

  const runHealthChecks = useCallback(async () => {
    setIsLoading(true);

    // Reset mounted routes to CHECKING while keeping NOT_MOUNTED, REQUIRES_PARAM, and DISABLED as-is
    setResults(prev =>
      prev.map(r =>
        (r.route.mounted && !r.route.requiresParam && !r.route.disabled)
          ? { ...r, status: 'CHECKING' as const, latencyMs: 0 }
          : r,
      ),
    );

    const checkable = ROUTE_REGISTRY.filter(r => r.mounted && !r.requiresParam && !r.disabled);

    const pings = await Promise.allSettled(
      checkable.map(route => pingEndpoint(route.pingPath)),
    );

    setResults(prev => {
      const next = [...prev];
      checkable.forEach((route, i) => {
        const idx = next.findIndex(r => r.route.path === route.path);
        if (idx === -1) return;

        const ping = pings[i];
        if (ping.status === 'fulfilled' && ping.value.ok) {
          next[idx] = {
            route,
            status: 'LIVE',
            latencyMs: ping.value.latencyMs,
            checkedAt: new Date(),
          };
        } else {
          next[idx] = {
            route,
            status: 'ERROR',
            latencyMs:
              ping.status === 'fulfilled' ? ping.value.latencyMs : 0,
            checkedAt: new Date(),
          };
        }
      });
      return next;
    });

    setIsLoading(false);
  }, []);

  useEffect(() => {
    runHealthChecks();
  }, [runHealthChecks]);

  // Derived counts for the header stats
  const liveCount = results.filter(r => r.status === 'LIVE').length;
  const errorCount = results.filter(r => r.status === 'ERROR').length;
  const notMountedCount = results.filter(r => r.status === 'NOT_MOUNTED' || r.status === 'REQUIRES_PARAM' || r.status === 'DISABLED').length;

  return (
    <div className="space-y-8 pb-12">
      <AdminHeader
        totalRoutes={ROUTE_REGISTRY.length}
        liveCount={liveCount}
        errorCount={errorCount}
        notMountedCount={notMountedCount}
        isLoading={isLoading}
      />

      <EndpointHealthGrid
        results={results}
        isLoading={isLoading}
        onRefresh={runHealthChecks}
      />

      <DataFreshnessTable results={results} isLoading={isLoading} />

      <AutomationModeControl />
    </div>
  );
}
