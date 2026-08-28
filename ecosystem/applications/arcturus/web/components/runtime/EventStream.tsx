import type { RuntimeMessage } from '../../lib/types';
import Card from '../ui/Card';

export default function EventStream({ events }: { events: RuntimeMessage[] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-slate-950">Live events</h2>
        <span className="text-xs text-slate-500">{events.length} received</span>
      </div>
      {events.length === 0 ? (
        <p className="mt-5 text-sm text-slate-600">No runtime events have been received.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {events.map((event, index) => (
            <li key={`${event.type}-${index}`} className="border-l-2 border-sky-300 pl-3">
              <p className="text-sm font-medium text-slate-800">{event.type}</p>
              <p className="mt-1 break-all text-xs text-slate-500">{event.payload?.message || event.payload?.stage || event.payload?.status || event.payload?.run_id || 'Event received'}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
