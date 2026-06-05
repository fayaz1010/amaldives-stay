'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  subdomain: string;
  propertyName: string;
  name: string;
  avatarUrl: string | null;
  greeting: string;
  accentColor: string;
}

interface Msg { role: 'user' | 'assistant'; content: string }

const SIZE_CLOSED = { w: 96, h: 96 };
const SIZE_OPEN = { w: 384, h: 600 };

// Linkify bare/markdown URLs so booking links are clickable.
function renderText(text: string, accent: string) {
  const parts: React.ReactNode[] = [];
  // markdown [label](url) first, then bare urls
  const md = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0; let m: RegExpExecArray | null; let key = 0;
  const pushPlain = (s: string) => {
    const url = /(https?:\/\/[^\s)]+)/g; let l = 0; let mm: RegExpExecArray | null;
    while ((mm = url.exec(s))) {
      if (mm.index > l) parts.push(s.slice(l, mm.index));
      parts.push(<a key={`u${key++}`} href={mm[1]} target="_blank" rel="noopener noreferrer" style={{ color: accent, fontWeight: 600 }}>{mm[1]}</a>);
      l = mm.index + mm[1].length;
    }
    if (l < s.length) parts.push(s.slice(l));
  };
  while ((m = md.exec(text))) {
    if (m.index > last) pushPlain(text.slice(last, m.index));
    parts.push(<a key={`m${key++}`} href={m[2]} target="_blank" rel="noopener noreferrer" style={{ color: accent, fontWeight: 600 }}>{m[1]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) pushPlain(text.slice(last));
  return parts;
}

export function AssistantWidget({ subdomain, propertyName, name, avatarUrl, greeting, accentColor }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: greeting }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const postSize = useCallback((o: boolean) => {
    const s = o ? SIZE_OPEN : SIZE_CLOSED;
    window.parent?.postMessage({ type: 'maya:size', ...s }, '*');
  }, []);

  // The iframe body must be transparent so only the bubble/panel shows over
  // the host site (the loader iframe has no background).
  useEffect(() => {
    const html = document.documentElement, body = document.body;
    html.style.background = 'transparent'; body.style.background = 'transparent'; body.style.margin = '0';
  }, []);

  useEffect(() => { postSize(false); }, [postSize]);
  useEffect(() => { postSize(open); }, [open, postSize]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: 'smooth' }); }, [messages, busy]);

  const initials = name.trim().slice(0, 1).toUpperCase() || 'M';

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch(`/api/public/${subdomain}/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: next.slice(-8) }),
      });
      const j = await res.json().catch(() => ({}));
      setMessages((m) => [...m, { role: 'assistant', content: j.reply || 'Sorry — I had trouble there. Please try again.' }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Connection issue — please try again.' }]);
    } finally {
      setBusy(false);
    }
  }

  const Avatar = ({ size }: { size: number }) =>
    avatarUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt={name} width={size} height={size} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
    ) : (
      <div style={{ width: size, height: size, borderRadius: '50%', background: accentColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.42 }}>{initials}</div>
    );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'transparent', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', overflow: 'hidden' }}>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={`Chat with ${name}`}
          style={{ position: 'absolute', right: 16, bottom: 16, width: 64, height: 64, borderRadius: '50%', border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,.25)', background: accentColor, padding: 0, overflow: 'hidden' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}><Avatar size={64} /></span>
        </button>
      )}
      {open && (
        <div style={{ position: 'absolute', right: 12, bottom: 12, width: 360, maxWidth: 'calc(100% - 24px)', height: 576, maxHeight: 'calc(100% - 24px)', background: '#fff', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: accentColor, color: '#fff', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.1 }}>{name}</div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>{propertyName} · usually replies instantly</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 12, background: '#f7f7f8', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', background: m.role === 'user' ? accentColor : '#fff', color: m.role === 'user' ? '#fff' : '#111', padding: '8px 11px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.4, boxShadow: '0 1px 2px rgba(0,0,0,.06)', wordBreak: 'break-word' }}>
                {m.role === 'assistant' ? renderText(m.content, accentColor) : m.content}
              </div>
            ))}
            {busy && <div style={{ alignSelf: 'flex-start', color: '#888', fontSize: 13, padding: '4px 8px' }}>{name} is typing…</div>}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #eee', background: '#fff' }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message…" style={{ flex: 1, border: '1px solid #ddd', borderRadius: 20, padding: '9px 14px', fontSize: 13.5, outline: 'none' }} />
            <button type="submit" disabled={busy || !input.trim()} style={{ background: accentColor, color: '#fff', border: 'none', borderRadius: 20, padding: '0 16px', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', opacity: busy || !input.trim() ? 0.5 : 1 }}>Send</button>
          </form>
          <div style={{ textAlign: 'center', fontSize: 10, color: '#aaa', padding: '4px 0 6px' }}>Powered by amaldives STAY</div>
        </div>
      )}
    </div>
  );
}
