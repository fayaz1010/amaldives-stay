import PostalMime from 'postal-mime';

// Base64-encode bytes in a Worker (no Buffer). Chunked to avoid call-stack limits.
function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// Forward attachment bytes for parseable rate-sheet types, base64-inline, but
// stay well under Vercel's ~4.5MB request-body limit so inbound never breaks.
// Each attachment capped at ~3MB raw; total base64 budget ~3.5MB; oversized or
// unsupported attachments fall back to metadata-only (same as before — no regression).
function buildAttachments(emailAttachments) {
  const PER_MAX = 3_000_000; // raw bytes per attachment
  let budget = 3_500_000; // total base64 chars across the email
  return (emailAttachments || []).map((a) => {
    const name = a.filename;
    const contentType = a.mimeType;
    const out = { name, contentType };
    try {
      const content = a.content;
      if (!content) return out;
      const bytes =
        content instanceof ArrayBuffer
          ? new Uint8Array(content)
          : new TextEncoder().encode(String(content));
      const ct = String(contentType || '').toLowerCase();
      const fn = String(name || '').toLowerCase();
      const parseable =
        /pdf|csv|excel|spreadsheet|text\/plain|officedocument/.test(ct) ||
        /\.(pdf|csv|tsv|txt|xlsx?|xls)$/i.test(fn);
      if (!parseable || bytes.length > PER_MAX) {
        out.skipped = bytes.length > PER_MAX ? 'too_large' : 'unsupported_type';
        return out;
      }
      const b64 = bytesToBase64(bytes);
      if (b64.length > budget) {
        out.skipped = 'budget_exceeded';
        return out;
      }
      budget -= b64.length;
      if (/pdf/.test(ct) || /\.pdf$/i.test(fn)) out.pdfBase64 = b64;
      else out.base64 = b64;
    } catch (e) {
      out.skipped = 'encode_error';
    }
    return out;
  });
}

/**
 * Cloudflare Email Worker — unified inbound for the amaldives.com zone.
 *
 * Since amaldives.com's apex MX now points at Cloudflare Email Routing
 * (catch-all → this worker), this worker handles EVERY inbound email and
 * dispatches by recipient:
 *
 *   ota-<subdomain>@amaldives.com  →  stay.amaldives.com OTA ingest webhook
 *   ota+<subdomain>@amaldives.com  →  (sub-addressing variant of the above)
 *   anything else @amaldives.com   →  amaldives.com /api/inbound/cloudflare,
 *                                     which runs the same customer-vs-resort
 *                                     dispatch that Resend Inbound used to.
 *
 * This preserves the existing resort/customer leads pipeline uninterrupted
 * while adding zero-config OTA booking ingest for every stay tenant.
 *
 * Bindings (wrangler.toml vars + secrets):
 *   OTA_WEBHOOK_URL        (var)    = https://stay.amaldives.com/api/webhooks/ota-email
 *   INBOUND_WEBHOOK_URL    (var)    = https://amaldives.com/api/inbound/cloudflare
 *   OTA_INGEST_SECRET      (secret) = same value as stay project's OTA_INGEST_SECRET
 *   INBOUND_WEBHOOK_SECRET (secret) = same value as amaldives project's INBOUND_WEBHOOK_SECRET
 */
export default {
  async email(message, env) {
    const recipient = (message.to || '').toLowerCase();
    const localPart = recipient.split('@')[0] || '';
    const isOta = localPart.startsWith('ota-') || localPart.startsWith('ota+');

    try {
      const buf = await new Response(message.raw).arrayBuffer();
      const email = await PostalMime.parse(buf);

      if (isOta) {
        const payload = {
          from: message.from,
          to: message.to, // routed address — identifies the tenant
          subject: email.subject || '',
          text: email.text || '',
          html: email.html || '',
        };
        const res = await fetch(env.OTA_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-ota-ingest-secret': env.OTA_INGEST_SECRET,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          console.error('ota webhook non-200', res.status, await res.text());
        }
        return;
      }

      // Everything else → amaldives leads/customer pipeline.
      const payload = {
        from: message.from,
        to: message.to,
        subject: email.subject || '',
        text: email.text || '',
        html: email.html || '',
        message_id: email.messageId || null,
        in_reply_to: email.inReplyTo || null,
        references: Array.isArray(email.references)
          ? email.references.join(' ')
          : email.references || null,
        attachments: buildAttachments(email.attachments),
      };
      const res = await fetch(env.INBOUND_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-inbound-secret': env.INBOUND_WEBHOOK_SECRET,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error('inbound webhook non-200', res.status, await res.text());
      }
    } catch (err) {
      console.error('email worker error', err);
    }
  },
};
