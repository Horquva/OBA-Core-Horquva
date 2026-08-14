export function SummaryCard({ title, value, change, context, status = 'info' }) {
  return {
    title,
    value,
    change,
    context,
    status,
    accessibility: {
      role: 'region',
      label: `${title} summary`,
      ariaLive: 'polite'
    }
  };
}

export function StatusBadge({ label, tone = 'neutral' }) {
  return {
    label,
    tone,
    accessibility: {
      role: 'status',
      label: `${label} status`
    }
  };
}

export function SectionFrame({ heading, description, items = [] }) {
  return {
    heading,
    description,
    items,
    accessibility: {
      role: 'region',
      label: heading
    }
  };
}

export function DetailList({ title, entries = [] }) {
  return {
    title,
    entries,
    accessibility: {
      role: 'list',
      label: title
    }
  };
}

export function NavigationList({ items = [] }) {
  return {
    items,
    accessibility: {
      role: 'navigation',
      label: 'Primary engineering navigation'
    }
  };
}
