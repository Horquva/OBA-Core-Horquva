/**
 * ORGANIZATIONAL ONTOLOGY RUNTIME (Huzaifa — Knowledge Platform Component 7)
 * -------------------------------------------------------------------------
 * Defines the ONE constitutional meaning of every organizational concept and
 * every relationship type. The same concept must never carry more than one
 * meaning across the Organizational Brain. Every module interprets these
 * concepts consistently.
 */

// Constitutional entity types (the vocabulary of organizational reality)
const ENTITY_TYPES = {
  organization: 'A registered organization (tenant) served by the Brain.',
  executive: 'A leader who receives role-aware organizational intelligence.',
  employee: 'A person who belongs to the organization.',
  team: 'A group of people working toward a shared outcome.',
  department: 'A formal organizational unit.',
  project: 'A bounded initiative with owners and outcomes.',
  system: 'A software system or platform used by the organization.',
  ai_agent: 'An AI tool or agent operating within the organization.',
  workflow: 'A defined path along which work moves.',
  process: 'A repeatable set of steps producing an outcome.',
  knowledge: 'A knowledge area, document, or institutional memory asset.',
  asset: 'Any owned organizational asset.',
  policy: 'A governance rule or policy.',
  risk: 'A discovered organizational vulnerability.',
  decision: 'A decision made or to be made in the organization.',
  capability: 'A constitutional service the Brain can perform.',
  vendor: 'An external supplier the organization depends on.',
  customer: 'An external customer the organization serves.',
}

// Constitutional relationship types (first-class intelligence assets)
const RELATIONSHIP_TYPES = {
  owns: 'Source owns target.',
  manages: 'Source manages target.',
  reports_to: 'Source reports to target.',
  collaborates_with: 'Source collaborates with target.',
  depends_on: 'Source depends on target.',
  controls: 'Source controls target.',
  governs: 'Source governs target.',
  executes: 'Source executes target.',
  creates: 'Source creates target.',
  consumes: 'Source consumes target.',
  supports: 'Source supports target.',
  uses: 'Source uses target.',
  produces: 'Source produces target.',
  concerns: 'Source concerns (is about) target.',
}

function isValidEntityType(type) {
  return Object.prototype.hasOwnProperty.call(ENTITY_TYPES, type)
}

function isValidRelationshipType(type) {
  return Object.prototype.hasOwnProperty.call(RELATIONSHIP_TYPES, type)
}

function assertEntityType(type) {
  if (!isValidEntityType(type)) {
    throw new Error(`Ontology violation: unknown entity type "${type}"`)
  }
}

function assertRelationshipType(type) {
  if (!isValidRelationshipType(type)) {
    throw new Error(`Ontology violation: unknown relationship type "${type}"`)
  }
}

module.exports = {
  ENTITY_TYPES,
  RELATIONSHIP_TYPES,
  isValidEntityType,
  isValidRelationshipType,
  assertEntityType,
  assertRelationshipType,
}
