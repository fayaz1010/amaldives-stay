import { NextRequest, NextResponse } from 'next/server';
import { vayvesFrom, VAYVES_REPLY_TO } from '@/lib/email-from';
import { prisma } from '@/lib/db';
import { getResend } from '@/lib/email';
import { normalizeEmail } from '@/lib/claim-policy';
import { notifyHqLead } from '@/lib/ozsystems-lead';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const ASSIST_NOTIFY_TO = process.env.CLAIM_ASSIST_NOTIFY_EMAIL || 'partnerships@amaldives.com';

/**
 * POST /api/public/claim/assist
 * Body: { slug, email, contactName?, phone?, message?, propertyName? }
 *
 * Manual-verification fallback for owners who can't pass the automated
 * domain/exact-email claim policy (most guesthouse contacts are free-email).
 * Staff verify by phone, then provision via scripts/create-tenant-admin.ts.
 */
export async function POST(request: NextRequest) {
  const rl = await rateLimit(`claim-assist:${clientIp(request)}`, 3, 60 * 60 * 1000);
  if (!rl.ok) return tooManyRequests();

  let body: {
    slug?: string;
    email?: string;
    contactName?: string;
    phone?: string;
    message?: string;
    propertyName?: string;
    website?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Honeypot — a hidden field no human fills in.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true, requestId: null });
  }

  const slug = String(body.slug || '').trim().toLowerCase().slice(0, 120);
  const email = normalizeEmail(String(body.email || '')).slice(0, 200);
  if (!slug || !email || !email.includes('@')) {
    return NextResponse.json({ error: 'slug and a valid email are required' }, { status: 400 });
  }

  // Form-spam bots fill every field with random character soup. Real property
  // and contact names contain a space or separator and aren't a coin-flip of
  // upper/lower case; a message that merely repeats the email is another tell.
  const looksRandom = (s: string): boolean => {
    const v = s.trim();
    if (v.length < 12) return false;
    if (/[\s._'\-]/.test(v)) return false;
    const switches = v.split('').filter((ch, i, arr) => i > 0 && /[a-z]/i.test(ch) && /[a-z]/i.test(arr[i - 1]) && (ch === ch.toUpperCase()) !== (arr[i - 1] === arr[i - 1].toUpperCase())).length;
    return switches >= 4;
  };

  const propertyName = String(body.propertyName || '').slice(0, 200);
  const contactName = String(body.contactName || '').slice(0, 200);
  const message = String(body.message || '').slice(0, 2000);
  const spam =
    looksRandom(propertyName) ||
    looksRandom(contactName) ||
    (message.trim() !== '' && normalizeEmail(message) === email);

  if (spam) {
    // Record it (so the pattern stays visible) but never page a human.
    await prisma.claimAssistRequest.create({
      data: {
        slug,
        email,
        propertyName: propertyName || null,
        contactName: contactName || null,
        phone: String(body.phone || '').slice(0, 60) || null,
        message: message || null,
        status: 'spam',
      },
    });
    return NextResponse.json({ ok: true, requestId: null });
  }

  const req = await prisma.claimAssistRequest.create({
    data: {
      slug,
      email,
      propertyName: String(body.propertyName || '').slice(0, 200) || null,
      contactName: String(body.contactName || '').slice(0, 200) || null,
      phone: String(body.phone || '').slice(0, 60) || null,
      message: String(body.message || '').slice(0, 2000) || null,
    },
  });

  // Notify the team (fire-safe — the request row is the source of truth).
  try {
    const resend = getResend();
    if (resend) {
      await resend.emails.send({
        from: vayvesFrom(),
        replyTo: VAYVES_REPLY_TO,
        to: ASSIST_NOTIFY_TO,
        subject: `Claim verification needed: ${body.propertyName || slug}`,
        html: [
          `<p>Manual claim verification requested.</p>`,
          `<ul>`,
          `<li><strong>Property:</strong> ${body.propertyName || slug} (slug: ${slug})</li>`,
          `<li><strong>Contact:</strong> ${body.contactName || '—'}</li>`,
          `<li><strong>Email:</strong> ${email}</li>`,
          `<li><strong>Phone:</strong> ${body.phone || '—'}</li>`,
          `<li><strong>Message:</strong> ${body.message || '—'}</li>`,
          `<li><strong>Request ID:</strong> ${req.id}</li>`,
          `</ul>`,
          `<p>Verify by phone, then run: <code>npm run create-admin -- --tenant &lt;subdomain&gt; --email ${email}</code></p>`,
        ].join('\n'),
      });
    }
  } catch (err) {
    console.error('[claim-assist] notify failed', err);
  }

  await notifyHqLead({
    intent: 'demo_request',
    email,
    company: body.propertyName || slug,
    message: `Manual claim verification requested for "${body.propertyName || slug}" (${slug})`,
    metadata: { entry_point: 'claim_assist', slug, phone: body.phone || null },
  });

  return NextResponse.json({
    success: true,
    message: 'Request received. Our team will contact you to verify ownership — usually within 1 business day.',
  });
}
