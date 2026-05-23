type BookingConfirmationParams = {
  guestName: string;
  confirmationNumber: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  roomName: string;
  roomNumber: string;
  nights: number;
  totalAmount: number;
  currency: string;
  propertyPhone: string;
  propertyEmail: string;
};

type ArrivalReminderParams = {
  guestName: string;
  propertyName: string;
  checkIn: string;
  roomName: string;
  propertyPhone: string;
};

type StaffInviteParams = {
  recipientName: string;
  tenantName: string;
  inviterName: string;
  role: string;
  position: string;
  department: string;
  inviteUrl: string;
  expiresIn: string; // e.g., "7 days"
};

const TEAL = '#14B8A6';
const TEAL_DARK = '#0F766E';
const BORDER = '#E5E7EB';
const TEXT = '#111827';
const MUTED = '#6B7280';
const BG = '#F9FAFB';

function formatMoney(amount: number, currency: string): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `${currency} ${safe.toFixed(2)}`;
  }
}

function escapeHtml(input: string): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function bookingConfirmationHtml(params: BookingConfirmationParams): string {
  const {
    guestName,
    confirmationNumber,
    propertyName,
    checkIn,
    checkOut,
    roomName,
    roomNumber,
    nights,
    totalAmount,
    currency,
    propertyPhone,
    propertyEmail,
  } = params;

  const roomLabel = roomNumber
    ? `${escapeHtml(roomName)} (Room ${escapeHtml(roomNumber)})`
    : escapeHtml(roomName);

  const total = formatMoney(totalAmount, currency);

  const contactRows: string[] = [];
  if (propertyPhone) {
    contactRows.push(
      `<tr><td style="padding:6px 0;color:${MUTED};font-size:14px;">Phone</td><td style="padding:6px 0;color:${TEXT};font-size:14px;text-align:right;">${escapeHtml(propertyPhone)}</td></tr>`
    );
  }
  if (propertyEmail) {
    contactRows.push(
      `<tr><td style="padding:6px 0;color:${MUTED};font-size:14px;">Email</td><td style="padding:6px 0;color:${TEXT};font-size:14px;text-align:right;"><a href="mailto:${escapeHtml(propertyEmail)}" style="color:${TEAL_DARK};text-decoration:none;">${escapeHtml(propertyEmail)}</a></td></tr>`
    );
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Booking Confirmed</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid ${BORDER};">
          <tr>
            <td style="background:${TEAL};padding:28px 32px;">
              <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">amaldives STAY</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${TEXT};">Booking Confirmed!</h1>
              <p style="margin:0 0 8px;font-size:16px;color:${TEXT};">Dear ${escapeHtml(guestName)},</p>
              <p style="margin:0 0 24px;font-size:14px;color:${MUTED};line-height:1.5;">
                Thank you for booking with <strong style="color:${TEXT};">${escapeHtml(propertyName)}</strong>. Your reservation is confirmed. Details below:
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BORDER};border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};color:${MUTED};font-size:13px;">Confirmation #</td>
                  <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};color:${TEXT};font-size:14px;font-weight:600;text-align:right;">${escapeHtml(confirmationNumber)}</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};color:${MUTED};font-size:13px;">Check-in</td>
                  <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};color:${TEXT};font-size:14px;text-align:right;">${escapeHtml(checkIn)}</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};color:${MUTED};font-size:13px;">Check-out</td>
                  <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};color:${TEXT};font-size:14px;text-align:right;">${escapeHtml(checkOut)}</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};color:${MUTED};font-size:13px;">Room</td>
                  <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};color:${TEXT};font-size:14px;text-align:right;">${roomLabel}</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};color:${MUTED};font-size:13px;">Nights</td>
                  <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};color:${TEXT};font-size:14px;text-align:right;">${nights}</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;color:${MUTED};font-size:13px;">Total Amount</td>
                  <td style="padding:14px 16px;color:${TEAL_DARK};font-size:16px;font-weight:700;text-align:right;">${total}</td>
                </tr>
              </table>

              ${
                contactRows.length
                  ? `<h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:${TEXT};">Property Contact</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                ${contactRows.join('')}
              </table>`
                  : ''
              }

              <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.5;">
                We look forward to welcoming you. If you have any questions or special requests, just reply to this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:${BG};border-top:1px solid ${BORDER};text-align:center;">
              <div style="font-size:12px;color:${MUTED};">Powered by <strong style="color:${TEAL_DARK};">amaldives STAY</strong></div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function arrivalReminderHtml(params: ArrivalReminderParams): string {
  const { guestName, propertyName, checkIn, roomName, propertyPhone } = params;

  const phoneBlock = propertyPhone
    ? `<p style="margin:0 0 8px;font-size:14px;color:${TEXT};">
        <strong>WhatsApp / Phone:</strong>
        <a href="https://wa.me/${escapeHtml(propertyPhone.replace(/[^0-9]/g, ''))}" style="color:${TEAL_DARK};text-decoration:none;">${escapeHtml(propertyPhone)}</a>
      </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Your stay is coming up</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid ${BORDER};">
          <tr>
            <td style="background:${TEAL};padding:28px 32px;">
              <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">amaldives STAY</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${TEXT};">Your stay is coming up!</h1>
              <p style="margin:0 0 8px;font-size:16px;color:${TEXT};">Dear ${escapeHtml(guestName)},</p>
              <p style="margin:0 0 24px;font-size:14px;color:${MUTED};line-height:1.5;">
                We're getting ready to welcome you to <strong style="color:${TEXT};">${escapeHtml(propertyName)}</strong>. Here are your arrival details:
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BORDER};border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};color:${MUTED};font-size:13px;">Check-in date</td>
                  <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};color:${TEXT};font-size:14px;text-align:right;">${escapeHtml(checkIn)}</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};color:${MUTED};font-size:13px;">Check-in time</td>
                  <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};color:${TEXT};font-size:14px;text-align:right;">15:00</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;color:${MUTED};font-size:13px;">Room</td>
                  <td style="padding:14px 16px;color:${TEXT};font-size:14px;text-align:right;">${escapeHtml(roomName)}</td>
                </tr>
              </table>

              <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:${TEXT};">Need anything before you arrive?</h2>
              ${phoneBlock}
              <p style="margin:8px 0 0;font-size:13px;color:${MUTED};line-height:1.5;">
                Reach out anytime — we're happy to help with transfers, dietary preferences, or special arrangements.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:${BG};border-top:1px solid ${BORDER};text-align:center;">
              <div style="font-size:12px;color:${MUTED};">Powered by <strong style="color:${TEAL_DARK};">amaldives STAY</strong></div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function staffInviteHtml(params: StaffInviteParams): string {
  const {
    recipientName,
    tenantName,
    inviterName,
    role,
    position,
    department,
    inviteUrl,
    expiresIn,
  } = params;
  const safeName = escapeHtml(recipientName);
  const safeTenant = escapeHtml(tenantName);
  const safeInviter = escapeHtml(inviterName);
  const safeRole = escapeHtml(role.replace(/_/g, ' ').toLowerCase());
  const safePosition = escapeHtml(position);
  const safeDepartment = escapeHtml(department);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>You're invited to ${safeTenant}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${TEXT};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg,${TEAL} 0%,${TEAL_DARK} 100%);color:#ffffff;">
              <div style="font-size:13px;letter-spacing:1px;text-transform:uppercase;opacity:0.85;">amaldives STAY</div>
              <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;">You're invited to join ${safeTenant}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 12px;font-size:16px;">Hi ${safeName},</p>
              <p style="margin:0 0 16px;font-size:14px;color:${TEXT};line-height:1.55;">
                <strong>${safeInviter}</strong> has invited you to join <strong>${safeTenant}</strong>
                on amaldives STAY as the <strong>${safePosition}</strong> in the
                <strong>${safeDepartment}</strong> team (role: <em>${safeRole}</em>).
              </p>
              <p style="margin:0 0 20px;font-size:14px;color:${TEXT};line-height:1.55;">
                Click the button below to set your password and get started.
                The link expires in <strong>${expiresIn}</strong>.
              </p>
              <p style="margin:0 0 20px;text-align:center;">
                <a href="${inviteUrl}" style="display:inline-block;background:${TEAL_DARK};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;">
                  Set your password &amp; sign in
                </a>
              </p>
              <p style="margin:0 0 8px;font-size:12px;color:${MUTED};line-height:1.55;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 16px;font-size:12px;color:${MUTED};word-break:break-all;font-family:Menlo,monospace;background:${BG};padding:8px 10px;border-radius:6px;border:1px solid ${BORDER};">
                ${escapeHtml(inviteUrl)}
              </p>
              <p style="margin:16px 0 0;font-size:12px;color:${MUTED};line-height:1.55;">
                Not expecting this invitation? You can safely ignore this email.
                Your team admin can re-send the invite if needed.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:${BG};border-top:1px solid ${BORDER};text-align:center;">
              <div style="font-size:12px;color:${MUTED};">
                Sent by <strong style="color:${TEAL_DARK};">${safeTenant}</strong> ·
                Powered by <strong style="color:${TEAL_DARK};">amaldives STAY</strong>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
