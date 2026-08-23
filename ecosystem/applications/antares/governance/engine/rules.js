// governance/engine/rules.js
'use strict';
//
// Sample GovernanceRule registry. In a real deployment these would be loaded from a
// rules store/DB (Din 6 concern); for now this is an in-memory list the engine reads
// from, built using the createGovernanceRule() factory from Din 2 so every rule here
// is already schema-valid.

const { createGovernanceRule } = require('./models');

const RULES = [
  createGovernanceRule({
    id: 'R-01',
    name: 'Reads are generally allowed',
    description: 'Reading a customer record is low-risk and allowed by default.',
    appliesTo: { actions: ['read_customer_record'] },
    requirement: 'ALLOW_IF_MATCH',
    severity: 'LOW',
    active: true
  }),
  createGovernanceRule({
    id: 'R-05',
    name: 'Updates are conditional on trust',
    description: 'Updating a customer record is allowed automatically only if the actor is highly trusted and no anomaly is present; otherwise it needs a second look.',
    appliesTo: { actions: ['update_customer_record'] },
    requirement: 'CONDITIONAL',
    severity: 'MEDIUM',
    active: true
  }),
  createGovernanceRule({
    id: 'R-09',
    name: 'PII deletion requires human review',
    description: 'Deletion of sensitive PII records always requires HUMAN_REVIEW, regardless of actor or claimed authority.',
    appliesTo: { actions: ['delete_customer_record'], resourceTypes: ['customer_record'] },
    requirement: 'REQUIRE_HUMAN_REVIEW_IF_MATCH',
    severity: 'HIGH',
    active: true
  }),
  createGovernanceRule({
    id: 'R-13',
    name: 'Unverified actors are always rejected',
    description: 'Any action from an actor whose identity/role could not be verified is rejected outright, before any trust scoring happens.',
    appliesTo: { actions: ['*'], actorRoles: ['unverified_agent'] },
    requirement: 'REJECT_IF_MATCH',
    severity: 'CRITICAL',
    active: true
  })
];

module.exports = { RULES };
