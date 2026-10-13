/**
 * SIMPLE Studio Email Delivery Engine
 * Pure Node.js built-in HTTPS (0 external dependencies)
 * Dispatches:
 *  1. Owner Alert -> simple.agency0011@gmail.com
 *  2. Client Confirmation -> client email address
 */

const https = require('https');
const { scrubPII } = require('./security-utils');

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'simple.agency0011@gmail.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'SIMPLE Studio <onboarding@resend.dev>';

/**
 * Send an email via Resend API using pure native Node.js https
 */
function sendViaResend(to, subject, html, text) {
  return new Promise((resolve) => {
    if (!RESEND_API_KEY) {
      return resolve({ success: false, reason: 'NO_RESEND_KEY' });
    }

    const payload = JSON.stringify({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html,
      text: text
    });

    const options = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'resend-node/2.0.0',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, id: parsed.id });
          } else {
            resolve({ success: false, error: parsed, statusCode: res.statusCode });
          }
        } catch (e) {
          resolve({ success: false, error: body, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Generate formatted HTML template for Agency Owner
 */
function generateOwnerEmailTemplate(data) {
  const cleanPhone = (data.phone || '').replace(/[^\d+]/g, '');
  const waLink = `https://wa.me/${cleanPhone.replace('+', '')}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #000000; color: #FFFFFF; padding: 24px 12px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #0c0c0e; border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; overflow: hidden;">
    
    <div style="background: linear-gradient(90deg, #ffffff 0%, #a1a1aa 100%); padding: 3px;"></div>
    
    <div style="padding: 28px 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 20px;">
        <span style="font-size: 20px; font-weight: 900; letter-spacing: 0.15em; color: #FFFFFF;">SIMPLE</span>
        <span style="font-size: 11px; font-weight: 700; background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(16, 185, 129, 0.3);">NEW LEAD ALERT</span>
      </div>

      <h2 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 8px;">🔥 New Booking: ${data.name}</h2>
      <p style="font-size: 13px; color: #a1a1aa; margin: 0 0 20px;">A new client just submitted a plan booking on <strong style="color: #ffffff;">simple-chi-nine.vercel.app</strong>.</p>

      <div style="background: #141416; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 18px; margin-bottom: 22px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #71717a; width: 130px;">Booking Ref:</td>
            <td style="padding: 6px 0; color: #ffffff; font-weight: 700; font-family: monospace;">${data.bookingId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #71717a;">Client Name:</td>
            <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #71717a;">Phone / WhatsApp:</td>
            <td style="padding: 6px 0; color: #34d399; font-weight: 700;">
              <a href="${waLink}" style="color: #34d399; text-decoration: underline;">${data.phone}</a>
            </td>
          </tr>
          ${data.email ? `
          <tr>
            <td style="padding: 6px 0; color: #71717a;">Email Address:</td>
            <td style="padding: 6px 0; color: #ffffff;">
              <a href="mailto:${data.email}" style="color: #ffffff; text-decoration: underline;">${data.email}</a>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; color: #71717a;">Selected Plan:</td>
            <td style="padding: 6px 0; color: #ffffff; font-weight: 700;">${data.service || data.planName || 'General Inquiry'}</td>
          </tr>
          ${data.platformOption ? `
          <tr>
            <td style="padding: 6px 0; color: #71717a;">Platform Choice:</td>
            <td style="padding: 6px 0; color: #ffffff;">${data.platformOption}</td>
          </tr>` : ''}
          ${data.message ? `
          <tr>
            <td style="padding: 6px 0; color: #71717a; vertical-align: top;">Client Notes:</td>
            <td style="padding: 6px 0; color: #d4d4d8; line-height: 1.5;">${data.message}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- Quick Action Buttons -->
      <div style="text-align: center; margin: 24px 0 16px;">
        <a href="${waLink}" style="display: inline-block; background: #25D366; color: #000000; font-weight: 800; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 999px; margin-right: 8px;">
          💬 Chat on WhatsApp
        </a>
        ${data.email ? `
        <a href="mailto:${data.email}" style="display: inline-block; background: #ffffff; color: #000000; font-weight: 800; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 999px;">
          ✉️ Reply via Email
        </a>` : ''}
      </div>

      <div style="font-size: 11px; color: #71717a; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px; text-align: center;">
        Submitted at: <strong>${data.createdAt}</strong> · SLA: Reply within 24h
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate formatted HTML template for Client Confirmation
 */
function generateClientEmailTemplate(data) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #000000; color: #FFFFFF; padding: 24px 12px; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background: #0c0c0e; border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(90deg, #ffffff 0%, #71717a 100%); padding: 3px;"></div>
    
    <div style="padding: 28px 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 20px;">
        <span style="font-size: 20px; font-weight: 900; letter-spacing: 0.15em; color: #FFFFFF;">SIMPLE</span>
        <span style="font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.1); color: #ffffff; padding: 4px 10px; border-radius: 999px;">CONFIRMATION</span>
      </div>

      <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 10px; color: #ffffff;">✦ Booking Received, ${data.name}!</h2>
      <p style="font-size: 14px; color: #a1a1aa; margin: 0 0 20px; line-height: 1.6;">
        Thank you for choosing SIMPLE. We have received your inquiry for <strong style="color: #ffffff;">${data.service || data.planName || 'Digital Services'}</strong>. Our team and AI Concierge have logged your project brief.
      </p>

      <div style="background: #141416; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <h4 style="margin: 0 0 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1aa;">Booking Summary</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 5px 0; color: #71717a;">Reference ID:</td>
            <td style="padding: 5px 0; color: #ffffff; font-weight: 700; font-family: monospace;">${data.bookingId}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #71717a;">Selected Plan:</td>
            <td style="padding: 5px 0; color: #ffffff; font-weight: 700;">${data.service || data.planName || 'General Inquiry'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #71717a;">Contact Phone:</td>
            <td style="padding: 5px 0; color: #ffffff;">${data.phone}</td>
          </tr>
        </table>
      </div>

      <h4 style="font-size: 13px; color: #ffffff; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.05em;">What Happens Next:</h4>
      <ol style="font-size: 13px; color: #a1a1aa; line-height: 1.6; margin: 0 0 24px; padding-left: 20px;">
        <li style="margin-bottom: 8px;"><strong style="color:#ffffff;">Direct Contact:</strong> We will reach out via WhatsApp or phone within 24 business hours to discuss your brand goals.</li>
        <li style="margin-bottom: 8px;"><strong style="color:#ffffff;">Rapid Delivery:</strong> Clean websites (5–7 days), 24/7 AI conversational bots (3–5 days), and targeted ad setup (48–72h).</li>
        <li><strong style="color:#ffffff;">Full Ownership:</strong> You own 100% of your source code and digital assets upon launch.</li>
      </ol>

      <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; font-size: 11px; color: #71717a; text-align: center;">
        © 2026 SIMPLE Studio · Make your work simple.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Main Dispatcher: Sends emails to BOTH Owner and Client
 */
async function dispatchBookingEmails(bookingData) {
  const planLabel = bookingData.service || bookingData.planName || 'Inquiry';
  const ownerSubject = `🔥 New Booking Request: ${planLabel} - ${bookingData.name}`;
  const ownerHtml = generateOwnerEmailTemplate(bookingData);
  const ownerText = `New Booking Received!\nPlan: ${planLabel}\nName: ${bookingData.name}\nPhone: ${bookingData.phone}\nEmail: ${bookingData.email || 'N/A'}\nMessage: ${bookingData.message || 'None'}`;

  // 1. Dispatch to Owner (Always works via Resend onboarding domain)
  const ownerResult = await sendViaResend(OWNER_EMAIL, ownerSubject, ownerHtml, ownerText);

  // 2. Dispatch to Client (If client email provided)
  let clientResult = { success: false, reason: 'NO_CLIENT_EMAIL' };
  if (bookingData.email) {
    const clientSubject = `✦ Booking Received: Welcome to SIMPLE - ${planLabel}`;
    const clientHtml = generateClientEmailTemplate(bookingData);
    const clientText = `Hi ${bookingData.name},\nThank you for choosing SIMPLE! We have received your inquiry for ${planLabel}. We will contact you within 24 business hours.\nReference ID: ${bookingData.bookingId}\nTeam SIMPLE`;
    
    clientResult = await sendViaResend(bookingData.email, clientSubject, clientHtml, clientText);
  }

  console.log('[EMAIL_DISPATCH_RESULT]', scrubPII({
    bookingId: bookingData.bookingId,
    ownerStatus: ownerResult.success ? 'DELIVERED' : (ownerResult.error?.message || 'ERROR'),
    clientStatus: clientResult.success ? 'DELIVERED' : (clientResult.error?.message || clientResult.reason || 'ERROR')
  }));

  return {
    ownerResult,
    clientResult,
    bookingId: bookingData.bookingId
  };
}

module.exports = {
  dispatchBookingEmails,
  OWNER_EMAIL,
  RESEND_API_KEY
};
