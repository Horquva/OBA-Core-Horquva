import type { FactAttribute } from '@horquva/types';

/**
 * Facts a vendor API reports about usage and lifecycle. They are measured, not
 * claimed, so nobody is asked to confirm them and they never count as
 * "unconfirmed".
 */
export const TELEMETRY_ATTRIBUTES: ReadonlySet<FactAttribute> = new Set<FactAttribute>([
  'last_used_at',
  'expires_at',
  'owner_access',
  'owner_type',
  'cost_30d_usd',
  'usage_tokens_30d',
  'credential_expires_at',
  'created_by_user',
]);
