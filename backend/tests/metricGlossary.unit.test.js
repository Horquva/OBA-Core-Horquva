const { metrics, getMetricDefinition } = require('../../backend/domain/metricGlossary')

const EXPECTED_METRICS = [
  'accountability', 'collaboration', 'predictiveRisk', 'humanDependencyRisk',
  'knowledgeConcentration', 'orgMemory', 'assetContinuity', 'executiveMemory',
  'org_score', 'GI', 'MI', 'DI',
  'decisionQuality', 'orgHealth', 'orgHealthByDepartment', 'departmentExposure',
  'entityCriticality', 'edgeCriticality', 'spofVerdict', 'coverage',
]

describe('metricGlossary', () => {
  test.each(EXPECTED_METRICS)('%s has a glossary entry', (name) => {
    expect(getMetricDefinition(name)).not.toBeNull()
  })

  test('every entry has the required fields', () => {
    for (const m of metrics) {
      expect(m.metric).toBeTruthy()
      expect(m.label).toBeTruthy()
      expect(m.definition).toBeTruthy()
      expect(typeof m.authored).toBe('boolean')
      expect(m.computedIn).toBeTruthy()
      if (m.authored) expect(m.authoredNote).toBeTruthy()
    }
  })
})