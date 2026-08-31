import Badge from '../ui/Badge';

export default function QualityGateIndicator({ status }: { status?: string }) {
  const normalized = status?.toLowerCase();
  const tone = normalized === 'validated' ? 'success' : normalized === 'rejected' ? 'danger' : 'warning';

  return <Badge label={status || 'Unavailable'} tone={tone} />;
}
