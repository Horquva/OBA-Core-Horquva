'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { pingEndpoint } from '../../lib/api';
import { AdminHeader } from '../../components/admin/AdminHeader';
import {
  EndpointHealthGrid,
  ROUTE_REGISTRY,
  type HealthCheckResult,
} from '../../components/admin/EndpointHealthGrid';
import { DataFreshnessTable } from '../../components/admin/DataFreshnessTable';
import { AutomationModeControl } from '../../components/admin/AutomationModeControl';

// Ping in small waves instead of all at once — firing 50+ requests
// simultaneously at the single-threaded backend serializes their CPU-bound
// work behind each other, so the ones at the back of the queue miss the
// client-side timeout even though the backend would've answered eventually.
const PING_CONCURRENCY = 8;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: 'fulfilled', value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

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
  const runIdRef = useRef(0);
  const isRunningRef = useRef(false);

  const runHealthChecks = useCallback(async () => {
    // Guards against React StrictMode's dev-only double-invoke firing a
    // second full wave of requests concurrently with the first — that
    // doubles the load on the backend instead of just racing harmlessly.
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    const runId = ++runIdRef.current;
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

    const pings = await mapWithConcurrency(checkable, PING_CONCURRENCY, route =>
      pingEndpoint(route.pingPath),
    );

    // A newer run superseded this one (e.g. a fast repeat click of Refresh)
    // — drop these stale results instead of letting them race with the
    // newer run's state updates.
    if (runIdRef.current !== runId) {
      isRunningRef.current = false;
      return;
    }

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
    isRunningRef.current = false;
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
