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
  const planLabel = data.service || data.planName || 'Digital Services';
  const cleanPhone = (data.phone || '').replace(/[^\d+]/g, '');
  const waConciergeUrl = `https://wa.me/919407928737?text=${encodeURIComponent(`Hi SIMPLE Studio! 👋 I just booked the ${planLabel} package (Ref: ${data.bookingId}). Looking forward to discussing the onboarding!`)}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #000000; color: #FFFFFF; padding: 24px 12px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #0c0c0e; border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(90deg, #ffffff 0%, #10B981 100%); padding: 3px;"></div>
    
    <div style="padding: 32px 26px;">
      <!-- Brand Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 18px; margin-bottom: 22px;">
        <div>
          <span style="font-size: 22px; font-weight: 900; letter-spacing: 0.15em; color: #FFFFFF;">SIMPLE</span>
          <div style="font-size: 10px; color: #71717a; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 2px;">MAKE YOUR WORK SIMPLE</div>
        </div>
        <span style="font-size: 11px; font-weight: 700; background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 5px 12px; border-radius: 999px; border: 1px solid rgba(16, 185, 129, 0.3);">
          BOOKING CONFIRMED
        </span>
      </div>

      <!-- Thank You Note -->
      <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 10px; color: #ffffff;">
        ✦ Thank You, ${data.name}!
      </h2>
      <p style="font-size: 14px; color: #d4d4d8; margin: 0 0 16px; line-height: 1.65;">
        Thank you for choosing <strong>SIMPLE Studio</strong>. We truly appreciate your trust in us to build and elevate your digital presence. Our team and AI Concierge have recorded your booking and started reviewing your requirements.
      </p>

      <!-- Booking Summary Box -->
      <div style="background: #141416; border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 20px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #34d399;">
          📋 Your Booking Summary
        </h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #71717a; width: 140px;">Booking Reference:</td>
            <td style="padding: 6px 0; color: #ffffff; font-weight: 700; font-family: monospace;">${data.bookingId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #71717a;">Selected Package:</td>
            <td style="padding: 6px 0; color: #ffffff; font-weight: 700;">${planLabel}</td>
          </tr>
          ${data.platformOption ? `
          <tr>
            <td style="padding: 6px 0; color: #71717a;">Platform Choice:</td>
            <td style="padding: 6px 0; color: #ffffff;">${data.platformOption}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; color: #71717a;">Contact Phone:</td>
            <td style="padding: 6px 0; color: #ffffff;">${data.phone}</td>
          </tr>
          ${data.email ? `
          <tr>
            <td style="padding: 6px 0; color: #71717a;">Email Address:</td>
            <td style="padding: 6px 0; color: #ffffff;">${data.email}</td>
          </tr>` : ''}
          ${data.message ? `
          <tr>
            <td style="padding: 6px 0; color: #71717a; vertical-align: top;">Your Notes:</td>
            <td style="padding: 6px 0; color: #d4d4d8; line-height: 1.5;">${data.message}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- About SIMPLE / Business Details -->
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 20px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 10px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #ffffff;">
          🏢 About SIMPLE Studio
        </h4>
        <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6; margin: 0 0 12px;">
          SIMPLE is a modern digital agency focused on making client acquisition and digital branding effortless for businesses. We specialize in three core pillars:
        </p>
        <ul style="font-size: 13px; color: #d4d4d8; line-height: 1.6; margin: 0 0 14px; padding-left: 20px;">
          <li><strong style="color: #ffffff;">Custom Responsive Websites:</strong> Hand-crafted, modern web applications built for speed, SEO, and conversions with 100% source code ownership.</li>
          <li><strong style="color: #ffffff;">24/7 AI Conversational Agents:</strong> Intelligent WhatsApp and Instagram bots that answer FAQs, share product catalogs, and capture leads while you sleep.</li>
          <li><strong style="color: #ffffff;">Targeted Ad Management:</strong> Data-backed Meta (Instagram/Facebook) and Google advertising campaigns to put your offer in front of active buyers.</li>
        </ul>
        <div style="font-size: 12px; color: #71717a; border-top: 1px solid rgba(255,255,255,0.06); pt-2; padding-top: 10px;">
          <strong>Our Philosophy:</strong> No confusing retainers, no agency lock-in, and transparent deliverables completed in 3 to 7 business days.
        </div>
      </div>

      <!-- What Happens Next -->
      <h4 style="font-size: 13px; color: #ffffff; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.08em;">
        🚀 What Happens Next:
      </h4>
      <ol style="font-size: 13px; color: #a1a1aa; line-height: 1.65; margin: 0 0 24px; padding-left: 20px;">
        <li style="margin-bottom: 8px;"><strong style="color:#ffffff;">Kickoff & Discovery (Within 24 Hours):</strong> We will connect with you via WhatsApp or phone to review your brand assets and project goals.</li>
        <li style="margin-bottom: 8px;"><strong style="color:#ffffff;">Rapid Technical Sprint:</strong> We build, optimize, and test your deliverables (5–7 days for websites, 3–5 days for AI agents, 48–72h for ads).</li>
        <li><strong style="color:#ffffff;">Review & Final Handover:</strong> You review the live preview, request revisions, and receive full administrative ownership of your assets.</li>
      </ol>

      <!-- Immediate WhatsApp Concierge Button -->
      <div style="text-align: center; margin: 24px 0;">
        <a href="${waConciergeUrl}" style="display: inline-block; background: #25D366; color: #000000; font-weight: 800; font-size: 13px; text-decoration: none; padding: 14px 28px; border-radius: 999px; box-shadow: 0 0 25px rgba(37,211,102,0.25);">
          💬 Chat with AI Concierge on WhatsApp
        </a>
        <div style="font-size: 11px; color: #71717a; margin-top: 8px;">
          Direct connection to SIMPLE Studio (+91 94079 28737)
        </div>
      </div>

      <!-- Contact Directory & Socials -->
      <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 18px; margin-top: 24px; font-size: 12px; color: #71717a; text-align: center; line-height: 1.8;">
        <div><strong>SIMPLE Studio</strong> · Make your work simple.</div>
        <div>
          Official Email: <a href="mailto:simple.agency0011@gmail.com" style="color: #ffffff; text-decoration: underline;">simple.agency0011@gmail.com</a> · 
          Instagram: <a href="https://instagram.com/simple____agency" style="color: #34d399; text-decoration: underline;">@simple____agency</a>
        </div>
        <div>Website: <a href="https://simple-chi-nine.vercel.app" style="color: #ffffff;">simple-chi-nine.vercel.app</a></div>
        <div style="margin-top: 8px; font-size: 11px; color: #52525b;">© 2026 SIMPLE Studio. All rights reserved.</div>
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
