'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';

export interface StayChatMessage {
  id: string;
  senderRole: 'GUEST' | 'STAFF';
  body: string;
  createdAt: string;
}

interface StayChatPanelProps {
  /** Guest portal: `/api/guest/{token}/chat`. Admin: `/api/admin/stay-chat/{bookingId}` */
  apiPath: string;
  senderRole: 'GUEST' | 'STAFF';
  emptyHint?: string;
}

export function StayChatPanel({ apiPath, senderRole, emptyHint }: StayChatPanelProps) {
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<StayChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiPath, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load chat');
      setChatOpen(data.chatOpen);
      setMessages(data.conversation?.messages ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  async function send() {
    const body = draft.trim();
    if (!body || sending || !chatOpen) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      setDraft('');
      setMessages((prev) => [...prev, data.message]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!chatOpen) {
    return (
      <p className="text-sm text-gray-500 py-4 text-center">
        Chat opens on check-in day and stays available through departure day.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-gray-50 min-h-[200px] max-h-[320px] overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            {emptyHint ?? 'No messages yet. Say hello!'}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === senderRole;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    mine
                      ? 'bg-teal-600 text-white'
                      : 'bg-white border text-gray-800'
                  }`}
                >
                  <p>{m.body}</p>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-teal-100' : 'text-gray-400'}`}>
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="min-h-[72px] text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button
          type="button"
          className="shrink-0 bg-teal-600 hover:bg-teal-700"
          disabled={sending || !draft.trim()}
          onClick={send}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
