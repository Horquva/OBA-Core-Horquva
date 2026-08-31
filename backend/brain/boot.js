/**
 * BOOT CLI — boot the Organizational Brain standalone and print the Boot Report.
 * Run:  node backend/brain/boot.js
 */

const { bootBrain } = require('./index')

;(async () => {
  const { runtime, report } = bootBrain({ seed: true })

  const line = (c = '─') => console.log(c.repeat(64))
  line('═')
  console.log('  ' + report.title)
  line('═')
  console.log(`  Phase        : ${report.phase}`)
  console.log(`  Status       : ${report.status}`)
  console.log(`  Accepted     : ${report.accepted ? 'YES ✅' : 'NO ❌'}`)
  line()
  console.log(`  Modules      : ${report.modules.discovered}/${report.modules.expected} discovered`)
  console.log('  By owner     :')
  for (const [owner, n] of Object.entries(report.modules.byOwner)) {
    console.log(`      - ${owner.padEnd(10)} ${n} modules`)
  }
  console.log(`  Capabilities : ${report.capabilities.registered} registered`)
  console.log(`  Knowledge    : ${report.knowledgeGraph.entities} entities, ${report.knowledgeGraph.relationships} relationships`)
  line()
  console.log('  ACCEPTANCE CRITERIA')
  for (const c of report.acceptanceCriteria) {
    console.log(`      [${c.pass ? '✓' : ' '}] ${c.name}`)
  }
  line('═')

  // Demonstrate an end-to-end executive request through the runtime.
  console.log('  DEMO — Executive request: "biggest organizational risks?"')
  const result = await runtime.engine.execute({
    modules: ['M01', 'M02', 'M03', 'M24', 'M48', 'M55'],
    context: { role: 'CEO', question: 'What are our biggest organizational risks?' },
  })
  console.log('  Execution order :', result.executionOrder.join(' → '))
  console.log('  Modules run     :', result.modulesRun)
  console.log('  Fused confidence:', result.fusedConfidence)
  console.log('  Truth→Advisor   :', result.constitutionalRules.truthBeforeAdvisor)
  console.log('  Orchestrator last:', result.constitutionalRules.orchestratorLast)
  line('═')
  process.exit(report.accepted ? 0 : 1)
})().catch((e) => {
  console.error('BOOT FAILED:', e)
  process.exit(1)
})
