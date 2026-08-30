import type { TicketStatus } from '../api/client';

const STYLES: Record<TicketStatus, string> = {
  New: 'bg-status-new/15 text-status-new',
  Assigned: 'bg-status-assigned/15 text-status-assigned',
  'In Progress': 'bg-status-progress/15 text-status-progress',
  Resolved: 'bg-status-resolved/15 text-status-resolved',
};

export default function StatusBadge({ status }: { status: TicketStatus }) {
  const cls = STYLES[status] ?? 'bg-status-new/15 text-status-new';
  return (
    <span className={`inline-flex shrink-0 items-center rounded px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}