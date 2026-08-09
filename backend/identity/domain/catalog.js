/*
 * Sentinel Identity & Trust — authoritative permission catalogue and system roles.
 * This is the ONE source of truth for the RBAC vocabulary. Permissions are global
 * (resource:action); system roles are global templates (organization_id = NULL).
 */

// resource:action catalogue
const PERMISSIONS = [
  ['org', 'create', 'Create organizations'],
  ['org', 'read', 'View organizations'],
  ['org', 'manage', 'Modify organizations'],
  ['identity', 'create', 'Create identities'],
  ['identity', 'read', 'View identities'],
  ['identity', 'manage', 'Modify identities and lifecycle'],
  ['agent', 'create', 'Register AI agents'],
  ['agent', 'invoke', 'Invoke AI agent capabilities'],
  ['machine', 'create', 'Register machine identities'],
  ['role', 'create', 'Create roles'],
  ['role', 'read', 'View roles'],
  ['role', 'manage', 'Modify roles and permissions'],
  ['role', 'assign', 'Assign roles to identities'],
  ['permission', 'read', 'View permissions'],
  ['attribute', 'create', 'Create attributes'],
  ['attribute', 'read', 'View attributes'],
  ['attribute', 'manage', 'Modify attributes'],
  ['policy', 'create', 'Create trust policies'],
  ['policy', 'read', 'View trust policies'],
  ['policy', 'manage', 'Modify trust policies'],
  ['policy', 'evaluate', 'Evaluate trust policies'],
  ['session', 'read', 'View sessions'],
  ['session', 'revoke', 'Revoke sessions'],
  ['provider', 'create', 'Register identity providers'],
  ['provider', 'manage', 'Modify identity providers'],
  ['audit', 'read', 'Read the audit trail'],
].map(([resource, action, description]) => ({ resource, action, description, key: `${resource}:${action}` }))

const ALL = PERMISSIONS.map((p) => p.key)
const byPrefix = (prefix) => ALL.filter((k) => k.startsWith(prefix + ':'))

// System role templates → the permission keys they grant. '*' = all permissions.
const SYSTEM_ROLES = [
  {
    name: 'platform_admin',
    description: 'Full control of the Identity & Trust platform.',
    permissions: ['*'],
  },
  {
    name: 'identity_manager',
    description: 'Manage identities, attributes, and role assignments.',
    permissions: [
      ...byPrefix('identity'),
      'agent:create',
      'machine:create',
      ...byPrefix('attribute'),
      'role:read',
      'role:assign',
      'session:read',
      'session:revoke',
    ],
  },
  {
    name: 'auditor',
    description: 'Read-only visibility for certification and compliance.',
    permissions: ['org:read', 'identity:read', 'role:read', 'policy:read', 'audit:read'],
  },
  {
    name: 'service_account',
    description: 'Baseline profile for authenticated service-to-service calls.',
    permissions: ['identity:read', 'policy:read'],
  },
]

/** Resolve a role's permission keys, expanding the '*' wildcard to the full catalogue. */
function resolveRolePermissions(role) {
  if (role.permissions.includes('*')) return [...ALL]
  // de-duplicate while preserving only known permissions
  return [...new Set(role.permissions)].filter((k) => ALL.includes(k))
}

module.exports = { PERMISSIONS, ALL, SYSTEM_ROLES, resolveRolePermissions }
