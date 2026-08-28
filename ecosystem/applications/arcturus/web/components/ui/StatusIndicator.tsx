import type { ExecutionStatus } from '../../lib/types';
import Badge from './Badge';

const statusPresentation: Record<ExecutionStatus, { tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'; label: string }> = {
  CREATED: { tone: 'neutral', label: 'Created' },
  INITIALIZING: { tone: 'info', label: 'Initializing' },
  RUNNING: { tone: 'info', label: 'Running' },
  PAUSED: { tone: 'warning', label: 'Paused' },
  COMPLETED: { tone: 'success', label: 'Completed' },
  FAILED: { tone: 'danger', label: 'Failed' },
  BLOCKED: { tone: 'warning', label: 'Blocked' },
};

export default function StatusIndicator({ status }: { status: ExecutionStatus }) {
  const presentation = statusPresentation[status];

  return <Badge label={presentation.label} tone={presentation.tone} />;
}