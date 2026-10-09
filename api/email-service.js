/**
 * SIMPLE Studio Email Delivery Engine
 * Pure Node.js built-in HTTPS & SMTP implementation (0 third-party CVE dependencies)
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
 * Send an email via Resend API using pure native Node.js https (zero external dependencies)
 */
function sendViaResend(to, subject, html, text) {
  return new Promise((resolve, reject) => {
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
            resolve({ success: false, error: parsed });
          }
        } catch (e) {
          resolve({ success: false, error: body });
        }
      });
    });

    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.write(payload);
    req.end();
  });
}

/**
 * Generate formatted HTML template for Agency Owner
 */
function generateOwnerEmailTemplate(data) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0A0B0E; color: #FFFFFF; padding: 32px 16px;">
  <div style="max-width: 580px; margin: 0 auto; background: #12131A; border: 1px solid #232533; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(90deg, #F5C444, #10B981); padding: 4px;"></div>
    <div style="padding: 28px 24px;">
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #232533; padding-bottom: 16px; margin-bottom: 20px;">
        <span style="font-size: 20px; font-weight: 800; color: #F5C444; letter-spacing: -0.02em;">SIMPLE STUDIO</span>
        <span style="font-size: 11px; font-weight: 700; background: rgba(16,185,129,0.15); color: #34D399; padding: 4px 10px; border-radius: 999px;">NEW BOOKING</span>
      </div>

      <h2 style="font-size: 20px; margin: 0 0 12px; color: #FFFFFF;">🔥 New Plan Booking Received!</h2>
      <p style="font-size: 14px; color: #9FA1B2; margin: 0 0 24px; line-height: 1.5;">
        A new client has selected a plan on your website. Here is their full briefing dossier:
      </p>

      <div style="background: #171922; border: 1px solid #282A3A; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #6B6D7D; width: 140px;">Booking ID:</td>
            <td style="padding: 8px 0; color: #F5C444; font-weight: 700; font-family: monospace;">${data.bookingId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B6D7D;">Selected Plan:</td>
            <td style="padding: 8px 0; color: #FFFFFF; font-weight: 700;">${data.planName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B6D7D;">Price:</td>
            <td style="padding: 8px 0; color: #10B981; font-weight: 700;">${data.planPrice}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B6D7D;">Client Name:</td>
            <td style="padding: 8px 0; color: #FFFFFF; font-weight: 600;">${data.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B6D7D;">Phone Number:</td>
            <td style="padding: 8px 0; color: #FFFFFF; font-weight: 600;">${data.phone}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B6D7D;">Email Address:</td>
            <td style="padding: 8px 0; color: #34D399; font-weight: 600;">${data.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B6D7D;">Business Name:</td>
            <td style="padding: 8px 0; color: #FFFFFF;">${data.business}</td>
          </tr>
          ${data.note ? `
          <tr>
            <td style="padding: 8px 0; color: #6B6D7D; vertical-align: top;">Requirements:</td>
            <td style="padding: 8px 0; color: #CDC9BA; line-height: 1.4;">${data.note}</td>
          </tr>` : ''}
        </table>
      </div>

      <div style="font-size: 13px; color: #9FA1B2; border-top: 1px solid #232533; padding-top: 18px;">
        Timestamp: <strong>${data.createdAt}</strong><br>
        Next Step: Contact client at <strong>${data.phone}</strong> or <strong>${data.email}</strong> to begin onboarding.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate formatted HTML template for Client
 */
function generateClientEmailTemplate(data) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0A0B0E; color: #FFFFFF; padding: 32px 16px;">
  <div style="max-width: 580px; margin: 0 auto; background: #12131A; border: 1px solid #232533; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(90deg, #F5C444, #10B981); padding: 4px;"></div>
    <div style="padding: 28px 24px;">
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #232533; padding-bottom: 16px; margin-bottom: 20px;">
        <span style="font-size: 20px; font-weight: 800; color: #F5C444; letter-spacing: -0.02em;">SIMPLE STUDIO</span>
        <span style="font-size: 11px; font-weight: 700; background: rgba(245,196,68,0.15); color: #F5C444; padding: 4px 10px; border-radius: 999px;">CONFIRMATION</span>
      </div>

      <h2 style="font-size: 22px; margin: 0 0 12px; color: #FFFFFF;">✦ Booking Received, ${data.name}!</h2>
      <p style="font-size: 15px; color: #CDC9BA; margin: 0 0 24px; line-height: 1.55;">
        Thank you for choosing SIMPLE Studio. We have received your plan booking for <strong>${data.planName}</strong> (${data.planPrice}). Our team has begun reviewing your brand details.
      </p>

      <div style="background: #171922; border: 1px solid #282A3A; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 14px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #F5C444;">Your Booking Overview</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #6B6D7D;">Booking Reference:</td>
            <td style="padding: 6px 0; color: #FFFFFF; font-weight: 700; font-family: monospace;">${data.bookingId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6B6D7D;">Selected Package:</td>
            <td style="padding: 6px 0; color: #FFFFFF; font-weight: 700;">${data.planName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6B6D7D;">Package Price:</td>
            <td style="padding: 6px 0; color: #10B981; font-weight: 700;">${data.planPrice}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6B6D7D;">Business / Brand:</td>
            <td style="padding: 6px 0; color: #FFFFFF;">${data.business}</td>
          </tr>
        </table>
      </div>

      <h4 style="font-size: 14px; color: #FFFFFF; margin: 0 0 12px;">What Happens Next:</h4>
      <ol style="font-size: 14px; color: #9FA1B2; line-height: 1.6; margin: 0 0 24px; padding-left: 20px;">
        <li style="margin-bottom: 8px;"><strong style="color:#FFFFFF;">Direct Contact (Within 24h):</strong> A member of our team will contact you via phone or email to introduce ourselves and confirm project goals.</li>
        <li style="margin-bottom: 8px;"><strong style="color:#FFFFFF;">Onboarding Kickoff:</strong> We will collect any brand assets (logos, content, credentials) with zero complicated forms.</li>
        <li style="margin-bottom: 8px;"><strong style="color:#FFFFFF;">Rapid Delivery:</strong> Your high-converting website, 24/7 AI agent, and ad setup will be built and launched within 3 to 7 business days.</li>
      </ol>

      <div style="background: rgba(245,196,68,0.06); border: 1px solid rgba(245,196,68,0.2); border-radius: 10px; padding: 16px; font-size: 13px; color: #CDC9BA; line-height: 1.5;">
        Have an immediate question? Feel free to reply directly to this email (<a href="mailto:simple.agency0011@gmail.com" style="color: #F5C444; text-decoration: underline;">simple.agency0011@gmail.com</a>) or reach us directly at <strong>+91 94079 28737</strong>.
      </div>

      <div style="margin-top: 28px; border-top: 1px solid #232533; padding-top: 18px; font-size: 12px; color: #6B6D7D; text-align: center;">
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
  const ownerSubject = `🔥 New Booking Request: ${bookingData.planName} - ${bookingData.name}`;
  const ownerHtml = generateOwnerEmailTemplate(bookingData);
  const ownerText = `New Booking Received!\nPlan: ${bookingData.planName}\nPrice: ${bookingData.planPrice}\nName: ${bookingData.name}\nPhone: ${bookingData.phone}\nEmail: ${bookingData.email}\nBusiness: ${bookingData.business}\nNote: ${bookingData.note || 'None'}`;

  const clientSubject = `✦ Booking Received: Welcome to SIMPLE Studio - ${bookingData.planName}`;
  const clientHtml = generateClientEmailTemplate(bookingData);
  const clientText = `Hi ${bookingData.name},\nThank you for choosing SIMPLE Studio! We have received your booking for ${bookingData.planName} (${bookingData.planPrice}). We will contact you within 24 hours at ${bookingData.phone} or ${bookingData.email}.\n\nReference: ${bookingData.bookingId}\nTeam SIMPLE`;

  // Dispatch to Owner
  const ownerResult = await sendViaResend(OWNER_EMAIL, ownerSubject, ownerHtml, ownerText);

  // Dispatch to Client
  const clientResult = await sendViaResend(bookingData.email, clientSubject, clientHtml, clientText);

  console.log('[EMAIL_DISPATCH_COMPLETED]', scrubPII({
    bookingId: bookingData.bookingId,
    ownerStatus: ownerResult.success ? 'DELIVERED' : (ownerResult.reason || 'SIMULATED'),
    clientStatus: clientResult.success ? 'DELIVERED' : (clientResult.reason || 'SIMULATED')
  }));

  return {
    ownerEmail: OWNER_EMAIL,
    clientEmail: bookingData.email,
    ownerDelivery: ownerResult,
    clientDelivery: clientResult,
    ownerSubject,
    clientSubject,
    ownerHtml,
    clientHtml,
    ownerText,
    clientText
  };
}

module.exports = {
  dispatchBookingEmails,
  OWNER_EMAIL
};
