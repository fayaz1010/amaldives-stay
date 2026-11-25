import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateSetPasswordToken } from '@/lib/set-password-token';
import { getResend } from '@/lib/email';
import { vayvesFrom, VAYVES_REPLY_TO } from '@/lib/email-from';

export const dynamic = 'force-dynamic';

/**
 * POST /api/super-admin/claims/verify
 * Body: { claimId: string }
 *
 * Verifies a claim: creates or attaches the tenant admin login, marks the claim
 * verified, and sends a secure one-time sign-in / set-password link.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { claimId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const claimId = body.claimId;
  if (!claimId) {
    return NextResponse.json({ error: 'claimId is required' }, { status: 400 });
  }

  const claim = await prisma.claimAssistRequest.findUnique({
    where: { id: claimId },
  });

  if (!claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  if (claim.status === 'verified') {
    return NextResponse.json({ error: 'Claim already verified' }, { status: 409 });
  }

  const tenant = await prisma.tenant.findFirst({
    where: { 
      OR: [
        { subdomain: claim.slug },
        { amaldivesSlug: claim.slug },
      ],
    },
    select: { 
      id: true, 
      name: true, 
      subdomain: true, 
      status: true, 
      settings: true,
    },
  });

  if (!tenant) {
    return NextResponse.json({ 
      error: 'Tenant not found for this claim',
    }, { status: 404 });
  }

  const email = claim.email.trim().toLowerCase();
  const ownerName = claim.contactName || 'Hotel Admin';

  // Generate a secure single-use set-password token
  const { token, hashedToken, expiresAt } = generateSetPasswordToken();

  try {
    await prisma.$transaction(async (tx) => {
      // Create or update the user (no password yet - they'll set it via the link)
      const user = await tx.user.upsert({
        where: { email },
        update: {
          role: 'TENANT_ADMIN',
          tenantId: tenant.id,
          isActive: true,
          name: ownerName,
          setPasswordToken: hashedToken,
          setPasswordTokenExpiresAt: expiresAt,
        },
        create: {
          email,
          role: 'TENANT_ADMIN',
          tenantId: tenant.id,
          isActive: true,
          name: ownerName,
          setPasswordToken: hashedToken,
          setPasswordTokenExpiresAt: expiresAt,
        },
      });

      // Ensure membership exists
      await tx.tenantMembership.upsert({
        where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
        update: { role: 'TENANT_ADMIN', isDefault: true },
        create: { 
          userId: user.id, 
          tenantId: tenant.id, 
          role: 'TENANT_ADMIN', 
          isDefault: true,
        },
      });

      // Lock the listing (mark as claimed)
      const settings = (tenant.settings as Record<string, unknown> | null) ?? {};
      await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          settings: {
            ...settings,
            claimable: false,
            claimedAt: new Date().toISOString(),
            claimedByEmail: email,
            claimedVia: 'super_admin_verification',
          } as object,
        },
      });

      // Mark claim as verified
      await tx.claimAssistRequest.update({
        where: { id: claimId },
        data: { 
          status: 'verified',
          verifiedAt: new Date(),
        },
      });
    });

    // Send the set-password link email
    const resend = getResend();
    if (resend) {
      const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://vayves.com';
      const setPasswordUrl = `${origin}/auth/set-password?token=${encodeURIComponent(token)}`;
      
      await resend.emails.send({
        from: vayvesFrom('Vayves Support'),
        replyTo: VAYVES_REPLY_TO,
        to: email,
        subject: `Set your password for ${tenant.name}`,
        html: generateSetPasswordEmail({
          ownerName,
          propertyName: tenant.name,
          setPasswordUrl,
          subdomain: tenant.subdomain,
          expiresInHours: 24,
        }),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Claim verified and login sent',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
      },
    });
  } catch (error: any) {
    console.error('[verify-claim] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify claim' },
      { status: 500 }
    );
  }
}

function generateSetPasswordEmail(params: {
  ownerName: string;
  propertyName: string;
  setPasswordUrl: string;
  subdomain: string;
  expiresInHours: number;
}): string {
  const { ownerName, propertyName, setPasswordUrl, subdomain, expiresInHours } = params;
  const TEAL = '#14B8A6';
  const TEAL_DARK = '#0F766E';
  const BORDER = '#E5E7EB';
  const TEXT = '#111827';
  const MUTED = '#6B7280';
  const BG = '#F9FAFB';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Set your password</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${TEXT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid ${BORDER};">
          <tr>
            <td style="background:${TEAL};padding:28px 32px;">
              <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">Vayves</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${TEXT};">Your admin account is ready!</h1>
              <p style="margin:0 0 8px;font-size:16px;color:${TEXT};">Hi ${ownerName},</p>
              <p style="margin:0 0 24px;font-size:14px;color:${MUTED};line-height:1.5;">
                Your ownership claim for <strong style="color:${TEXT};">${propertyName}</strong> has been verified.
                Click the button below to set your password and activate your admin dashboard.
              </p>

              <p style="margin:0 0 20px;text-align:center;">
                <a href="${setPasswordUrl}" style="display:inline-block;background:${TEAL_DARK};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;">
                  Set your password
                </a>
              </p>

              <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:6px;padding:16px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:13px;color:#92400E;font-weight:600;">⏱ Link expires in ${expiresInHours} hours</p>
                <p style="margin:0;font-size:13px;color:#92400E;line-height:1.5;">
                  This link can only be used once. After you set your password, you'll be able to sign in at <strong>https://${subdomain}.vayves.com/auth/signin</strong>
                </p>
              </div>

              <p style="margin:0 0 12px;font-size:14px;color:${TEXT};font-weight:600;">Next steps after setting your password:</p>
              <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:${MUTED};line-height:1.8;">
                <li>Complete your property setup</li>
                <li>Add rooms and configure rates</li>
                <li>Set up your booking calendar</li>
                <li>Invite your team members</li>
              </ul>

              <p style="margin:0 0 8px;font-size:12px;color:${MUTED};line-height:1.5;">
                If the button doesn't work, copy and paste this link:
              </p>
              <p style="margin:0 0 16px;font-size:11px;color:${MUTED};word-break:break-all;font-family:Menlo,monospace;background:${BG};padding:8px 10px;border-radius:6px;border:1px solid ${BORDER};">
                ${setPasswordUrl}
              </p>

              <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.5;">
                Questions? Reply to this email — we're here to help.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:${BG};border-top:1px solid ${BORDER};text-align:center;">
              <div style="font-size:12px;color:${MUTED};">Powered by <strong style="color:${TEAL_DARK};">Vayves</strong></div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
