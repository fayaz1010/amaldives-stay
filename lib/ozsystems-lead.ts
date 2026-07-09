/**
 * Oz Systems HQ lead capture for vayves.com.
 *
 * Pushes demo-request / signup / contact submissions to the HQ sales agent
 * (POST https://www.ozsystems.com.au/api/agent/sales { action: 'create_lead' }).
 *
 * Design rules:
 *  - NEVER breaks the user flow: everything is wrapped in try/catch and the
 *    request is capped by a short timeout. All failures are swallowed
 *    (logged to console only).
 *  - No-op when OZSYSTEMS_AGENT_KEY is not configured.
 *  - Awaited (not detached) because Vercel freezes the lambda after the
 *    response is returned — but the timeout keeps worst-case added latency
 *    to ~3s and the normal case to a few hundred ms.
 */

const HQ_SALES_URL = 'https://www.ozsystems.com.au/api/agent/sales';
const HQ_TIMEOUT_MS = 3000;

export type HqLeadIntent = 'demo_request' | 'signup' | 'contact';

export interface HqLead {
  intent: HqLeadIntent;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  message?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/** Fire a lead to Oz Systems HQ. Safe to call anywhere — never throws. */
export async function notifyHqLead(lead: HqLead): Promise<void> {
  const key = process.env.OZSYSTEMS_AGENT_KEY;
  if (!key) return;

  try {
    const res = await fetch(HQ_SALES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-key': key,
      },
      body: JSON.stringify({
        action: 'create_lead',
        source: 'vayves.com',
        intent: lead.intent,
        name: lead.name ?? undefined,
        email: lead.email ?? undefined,
        phone: lead.phone ?? undefined,
        company: lead.company ?? undefined,
        message: lead.message ?? undefined,
        tags: lead.tags ?? undefined,
        metadata: lead.metadata ?? undefined,
      }),
      signal: AbortSignal.timeout(HQ_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('[ozsystems-lead] HQ responded', res.status);
    }
  } catch (err) {
    // Lead capture must never affect the user-facing flow.
    console.error('[ozsystems-lead] failed:', err instanceof Error ? err.message : err);
  }
}
