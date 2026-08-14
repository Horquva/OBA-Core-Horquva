import { altairRoutes } from '../../../platforms/web-foundation/index.js';

export const engineeringPlatformCatalog = altairRoutes.map((route) => ({
  ...route,
  summary: route.summary || 'Approved engineering experience.'
}));

export const engineeringPlatformRouteMap = Object.fromEntries(
  engineeringPlatformCatalog.map((route) => [route.id, route])
);

export function resolveEngineeringRoute(routeId) {
  const normalizedRoute = routeId || 'dashboard';
  return engineeringPlatformRouteMap[normalizedRoute] ?? engineeringPlatformRouteMap.dashboard;
}
