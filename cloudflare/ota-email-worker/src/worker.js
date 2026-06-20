import PostalMime from 'postal-mime';

/**
 * Cloudflare Email Worker — OTA booking-email ingest.
 *
 * Runs on a Cloudflare zone WE control (e.g. a dedicated ingest domain or
 * subdomain — never a tenant's mailbox). Each OTA is configured to send a copy
 * of its reservation notifications to an address like `ota-<subdomain>@<our-zone>`
 * (e.g. ota-rivethi-beach@ingest.amaldives.com). Cloudflare Email Routing
 * delivers it here; we parse the MIME and POST it to the stay.amaldives.com
 * webhook, which resolves the tenant from the recipient address and creates
 * the booking.
 *
 * Bind these in wrangler.toml / secrets:
 *   WEBHOOK_URL        = https://stay.amaldives.com/api/webhooks/ota-email   (var)
 *   OTA_INGEST_SECRET  = <same value set in the Vercel project>             (secret)
 */
export default {
  async email(message, env, ctx) {
    try {
      const buf = await new Response(message.raw).arrayBuffer();
      const email = await PostalMime.parse(buf);

      const payload = {
        from: message.from,
        to: message.to, // the routed address — identifies the tenant
        subject: email.subject || '',
        text: email.text || '',
        html: email.html || '',
      };

      const res = await fetch(env.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ota-ingest-secret': env.OTA_INGEST_SECRET,
        },
        body: JSON.stringify(payload),
      });

      // Don't bounce the sender on our own processing errors — just log.
      if (!res.ok) {
        console.error('ota-email webhook non-200', res.status, await res.text());
      }
    } catch (err) {
      console.error('ota-email worker error', err);
    }
  },
};
