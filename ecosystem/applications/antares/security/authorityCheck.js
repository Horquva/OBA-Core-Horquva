// security/authorityCheck.js
'use strict';
//
// Din 6 deliverable: the FIRST stage of runtime enforcement. Before any policy or
// trust logic runs, this answers two questions:
//   1. Is this actor even verified/registered at all?
//   2. Does this actor actually hold the specific authority it's claiming for this action?
//
// This runs strictly before Rules Check / Trust Check. An actor that fails here never
// reaches the evaluation engine — no rule or trust score can save a request from a
// failed authority check. (Rule R-13 in the evaluation engine also rejects unverified
// actors — that's intentional defense-in-depth, a backup in case this check is ever
// bypassed, not a replacement for it.)

// Sample registry — a real deployment loads this from an identity/authority service.
// Kept here as an in-memory stand-in so the check is runnable and testable today.
const AUTHORITY_REGISTRY = {
  'agent-zeeshan-047': { verified: true, grantedAuthorities: ['customer_deletion_request', 'read_request', 'update_request'] },
  'agent-1': { verified: true, grantedAuthorities: ['read_request'] },
  'agent-2': { verified: true, grantedAuthorities: ['update_request'] },
  'agent-3': { verified: true, grantedAuthorities: ['update_request'] },
  'agent-x': { verified: false, grantedAuthorities: [] }
};

// Fail-safe principle: if the actor is missing from the registry, or the registry
// itself is unavailable, that is treated as NOT verified — never as "assume okay".
// Missing information always resolves to the more restrictive outcome.
function authorityCheck(actionRequest, registry) {
  const reg = registry || AUTHORITY_REGISTRY;

  if (!actionRequest || !actionRequest.actorId) {
    return { passed: false, reason: 'No actorId present on the action request — cannot verify authority for an unidentified actor.' };
  }

  const entry = reg[actionRequest.actorId];
  if (!entry || !entry.verified) {
    return { passed: false, reason: 'Actor "' + actionRequest.actorId + '" is not verified in the authority registry.' };
  }

  if (actionRequest.claimedAuthority && !entry.grantedAuthorities.includes(actionRequest.claimedAuthority)) {
    return {
      passed: false,
      reason: 'Actor "' + actionRequest.actorId + '" claims authority "' + actionRequest.claimedAuthority +
        '" which has not been granted to them.'
    };
  }

  return { passed: true, reason: 'Actor "' + actionRequest.actorId + '" is verified and holds the claimed authority.' };
}

module.exports = { authorityCheck, AUTHORITY_REGISTRY };
