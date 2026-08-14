export const mockData = {
  summaryCards: [
    { id: 'delivery-health', title: 'Delivery health', value: '92%', change: '+6%', context: 'vs prior sprint', status: 'good' },
    { id: 'active-projects', title: 'Active projects', value: '14', change: '+2', context: 'planned capacity', status: 'info' },
    { id: 'critical-alerts', title: 'Critical alerts', value: '3', change: '-1', context: 'action required', status: 'warning' },
    { id: 'knowledge-updates', title: 'Knowledge updates', value: '18', change: '+4', context: 'this week', status: 'success' }
  ],
  projectStatus: [
    { id: 'platform-modernization', project: 'Platform modernization', progress: 82, health: 'on-track', owner: 'Alicia Morgan', risk: 'Low' },
    { id: 'risk-forecasting', project: 'Risk forecasting', progress: 61, health: 'watch', owner: 'Dev Patel', risk: 'Moderate' },
    { id: 'edge-logistics', project: 'Edge logistics', progress: 44, health: 'at-risk', owner: 'Jae Kim', risk: 'High' }
  ],
  notifications: [
    { id: 'n-101', title: 'Security review approved', message: 'The latest platform security assessment passed with no blocking issues.', read: false, actionRequired: false, category: 'security', timestamp: '2h ago' },
    { id: 'n-102', title: 'Approval required: release checklist', message: 'The release checklist for the enterprise integration project requires a final approval.', read: false, actionRequired: true, category: 'review', timestamp: '4h ago' },
    { id: 'n-103', title: 'Knowledge base updated', message: 'New operational runbooks were published for onboarding and incident response.', read: true, actionRequired: false, category: 'knowledge', timestamp: '1d ago' },
    { id: 'n-104', title: 'Project owner change', message: 'Darren Lee has been assigned as interim project owner for Weather Signal.', read: true, actionRequired: false, category: 'project', timestamp: '2d ago' }
  ],
  activity: [
    { id: 'a-001', title: 'Build pipeline completed', detail: 'A deployment artifact passed validation for the enterprise data plane.', time: '15 min ago' },
    { id: 'a-002', title: 'Knowledge asset published', detail: 'A new operations card for observability tuning was added to the knowledge library.', time: '1h ago' },
    { id: 'a-003', title: 'Review requested', detail: 'Security and compliance requested a review for the integration readiness checklist.', time: '3h ago' }
  ],
  projects: [
    { id: 'p-1001', name: 'Platform modernization', status: 'On track', owner: 'Alicia Morgan', phase: 'Execution', updated: '2h ago', metadata: { capacity: '82%', budget: '$1.4M', risk: 'Low' }, description: 'Modernize core engineering workflows, deployment assets, and support platforms.', approvedResources: ['Architecture review', 'Deployment runbook', 'Observability dashboard'] },
    { id: 'p-1002', name: 'Risk forecasting', status: 'Watch', owner: 'Dev Patel', phase: 'Model tuning', updated: '5h ago', metadata: { capacity: '61%', budget: '$0.9M', risk: 'Moderate' }, description: 'Align forecasting models and automated risk signals with enterprise service data.', approvedResources: ['Forecasting model spec', 'Risk register', 'Decision brief'] },
    { id: 'p-1003', name: 'Edge logistics', status: 'At risk', owner: 'Jae Kim', phase: 'Pilot', updated: '1d ago', metadata: { capacity: '44%', budget: '$1.1M', risk: 'High' }, description: 'Coordinate distributed logistics telemetry and operational readiness for edge environments.', approvedResources: ['Pilot checklist', 'Incident response plan', 'Operator guide'] }
  ],
  knowledge: [
    { id: 'k-2001', title: 'AI-assisted release validation', summary: 'Operational guidance for using controlled AI assistance in validation and evidence review.', category: 'engineering', tags: ['ai', 'release', 'quality'], access: 'approved', updated: '3d ago' },
    { id: 'k-2002', title: 'Security escalation playbook', summary: 'Checklist for escalation, review, and evidence handling during urgent security events.', category: 'security', tags: ['security', 'incident'], access: 'approved', updated: '1d ago' },
    { id: 'k-2003', title: 'Governance review model', summary: 'Overview of review gates, ownership, and operational signoff for project execution.', category: 'governance', tags: ['governance', 'review'], access: 'approved', updated: '5d ago' },
    { id: 'k-2004', title: 'Design system usage notes', summary: 'Patterns for responsive design, accessibility, and consistency across engineering experiences.', category: 'design', tags: ['design', 'ux'], access: 'approved', updated: '2d ago' }
  ],
  profile: {
    user: {
      id: 'u-404',
      name: 'Alicia Morgan',
      role: 'Engineering Lead',
      team: 'Platform Operations',
      location: 'Seattle, WA',
      availability: 'Available for review',
      avatar: 'AM'
    },
    contacts: [
      { label: 'Email', value: 'alicia.morgan@horquva.example' },
      { label: 'Slack', value: '@alicia-m' },
      { label: 'Manager', value: 'Nadia Shah' }
    ]
  },
  settings: {
    title: 'Platform settings',
    configurations: [
      { id: 'dashboard-view', label: 'Dashboard default view', value: 'Engineering summary', type: 'select' },
      { id: 'notifications', label: 'Notifications digest', value: 'Daily summary', type: 'select' },
      { id: 'accessibility', label: 'Accessibility preferences', value: 'High contrast enabled', type: 'toggle' },
      { id: 'security', label: 'Security review reminders', value: 'Enabled', type: 'toggle' }
    ]
  },
  workflows: [
    { id: 'wf-001', name: 'Release validation', state: 'Ready', owner: 'Ops team' },
    { id: 'wf-002', name: 'Project approval', state: 'Waiting on review', owner: 'Governance' }
  ]
};
