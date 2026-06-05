'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2, Bot, Copy, Check, Upload, ExternalLink } from 'lucide-react';

interface Cfg { name: string; avatarUrl: string | null; greeting: string; accentColor: string; enabled: boolean }

export function AssistantSettings() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [snippet, setSnippet] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/assistant');
        const j = await r.json();
        if (r.ok) { setCfg(j.config); setSnippet(j.embedSnippet); setEmbedUrl(j.embedUrl); }
        else setErr(j?.error || 'Failed to load');
      } catch { setErr('Failed to load'); } finally { setLoading(false); }
    })();
  }, []);

  function upd<K extends keyof Cfg>(k: K, v: Cfg[K]) { setCfg((c) => (c ? { ...c, [k]: v } : c)); }

  async function uploadAvatar(file: File) {
    setUploading(true); setErr(null);
    try {
      const fd = new FormData(); fd.append('files', file); fd.append('kind', 'assistant');
      const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (r.ok && j.urls?.[0]) upd('avatarUrl', j.urls[0]);
      else setErr(j?.error || 'Upload failed');
    } catch { setErr('Upload failed'); } finally { setUploading(false); }
  }

  async function save() {
    if (!cfg) return;
    setSaving(true); setErr(null); setSaved(false);
    try {
      const r = await fetch('/api/admin/assistant', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j?.error || 'Save failed'); return; }
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch { setErr('Save failed'); } finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center gap-2 text-gray-500 p-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (!cfg) return <div className="p-6 text-red-600">{err || 'Could not load assistant settings.'}</div>;

  const initials = (cfg.name || 'M').trim().slice(0, 1).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-teal-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Your AI assistant</h1>
          <p className="text-sm text-gray-500">A booking assistant for your website — your name, your photo. Answers from your property’s info.</p>
        </div>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            {cfg.avatarUrl
              ? // eslint-disable-next-line @next/next/no-img-element
                <img src={cfg.avatarUrl} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
              : <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ background: cfg.accentColor }}>{initials}</div>}
          </div>
          <div className="flex-1">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload photo
            </button>
            {cfg.avatarUrl && <button onClick={() => upd('avatarUrl', null)} className="ml-2 text-xs text-gray-500 hover:text-red-600">Remove</button>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-gray-600">Assistant name</span>
            <input value={cfg.name} onChange={(e) => upd('name', e.target.value)} placeholder="Maya"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Accent colour</span>
            <input type="color" value={cfg.accentColor} onChange={(e) => upd('accentColor', e.target.value)}
              className="mt-1 w-full h-[38px] rounded-lg border border-gray-300 px-1 py-1" />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-gray-600">Greeting message</span>
          <textarea value={cfg.greeting} onChange={(e) => upd('greeting', e.target.value)} rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => upd('enabled', e.target.checked)} />
          Assistant live on my website
        </label>

        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Add it to your website</h2>
        <p className="text-xs text-gray-500">Paste this one line just before <code>&lt;/body&gt;</code> on your site. The bubble appears bottom-right.</p>
        <div className="flex items-stretch gap-2">
          <code className="flex-1 rounded-lg bg-gray-900 text-gray-100 text-xs px-3 py-2 overflow-x-auto whitespace-nowrap">{snippet}</code>
          <button onClick={() => { navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {copied ? <Check className="h-4 w-4 text-teal-600" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-teal-700 hover:underline">
          Open live preview <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
