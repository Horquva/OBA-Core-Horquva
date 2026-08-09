/*
 * Repository layer aggregate — the ONLY approved data-access surface for the
 * identity platform. Services depend on this module; nothing else runs SQL.
 * (Enforced by an architecture test in identity/tests.)
 */
const identities = require('./identities')
const rbac = require('./rbac')
const trust = require('./trust')

module.exports = {
  organizations: require('./organizations'),
  principals: identities.principals,
  users: identities.users,
  agents: identities.agents,
  machines: identities.machines,
  roles: rbac.roles,
  permissions: rbac.permissions,
  assignments: rbac.assignments,
  attributes: require('./attributes'),
  sessions: require('./sessions'),
  policies: trust.policies,
  providers: trust.providers,
  federatedIdentities: trust.federatedIdentities,
  audit: require('./audit'),
}
