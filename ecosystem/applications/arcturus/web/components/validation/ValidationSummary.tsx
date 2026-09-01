'use client';

import { useValidationResult } from '../../hooks/useValidationResult';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ValidationSummaryProps {
  experimentId?: string;
  status?: string;
  reason?: string;
}

export default function ValidationSummary({ experimentId, status, reason }: ValidationSummaryProps) {
  const { result, loading, error } = useValidationResult(experimentId || '');

  // Show loading state
  if (loading && experimentId) {
    return <LoadingSpinner label="Loading validation results" />;
  }

  // Show error if fetch failed
  if (error && experimentId) {
    return (
      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Validation</p>
        <p className="mt-3 text-sm text-rose-700">{error}</p>
      </Card>
    );
  }

  // Show real result if available
  if (result) {
    const statusColor = result.final_status === 'validated' 
      ? 'text-emerald-700' 
      : result.final_status === 'rejected' 
      ? 'text-rose-700'
      : 'text-amber-700';

    return (
      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Validation</p>
        <p className={`mt-3 text-lg font-semibold ${statusColor}`}>{result.final_status.toUpperCase()}</p>
        <p className="mt-2 text-sm text-slate-600">{result.reason || 'No additional details available.'}</p>
        {result.passed_rules.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-emerald-700">Passed: {result.passed_rules.length}</p>
          </div>
        )}
        {result.failed_rules.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-rose-700">Failed: {result.failed_rules.length}</p>
          </div>
        )}
        {result.flagged_rules.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-amber-700">Flagged: {result.flagged_rules.length}</p>
          </div>
        )}
      </Card>
    );
  }

  // Show unavailable state (no experiment ID or result not found)
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Validation</p>
      <p className="mt-3 text-lg font-semibold text-slate-950">{status || 'Unavailable'}</p>
      <p className="mt-2 text-sm text-slate-600">{reason || 'No validation result is available from the current backend API.'}</p>
    </Card>
  );
}
