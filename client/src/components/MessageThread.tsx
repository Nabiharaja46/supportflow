import { useEffect, useRef } from 'react';
import type { Message } from '../api/client';

export default function MessageThread({
  messages,
  currentUserId,
}: {
  messages: Message[];
  currentUserId: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message when the list grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-ink-muted">
        No messages yet. Start the conversation below.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const isOwn = m.senderId === currentUserId;
        const isAgent = m.senderRole === 'agent';
        return (
          <div
            key={m._id}
            className={`border border-border bg-surface px-3 py-2 max-w-[85%] ${
              isOwn ? 'ml-auto border-l-4 border-l-accent' : 'mr-auto'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-ink">
                {isAgent ? 'Agent' : 'Customer'}
              </span>
              <span className="font-mono text-xs text-ink-muted">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{m.body}</p>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
