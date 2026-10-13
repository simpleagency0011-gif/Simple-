/**
 * SIMPLE Studio WhatsApp Notification & AI Concierge Engine
 * Handles:
 *  1. WhatsApp Concierge URL generation for immediate client chat
 *  2. Multi-channel WhatsApp notification dispatch (CallMeBot API / Webhook / Twilio)
 */

const https = require('https');
const http = require('http');
const { scrubPII } = require('./security-utils');

const OWNER_PHONE = process.env.OWNER_PHONE || '919407928737';
const CALLMEBOT_API_KEY = process.env.CALLMEBOT_API_KEY || '';
const WHATSAPP_WEBHOOK_URL = process.env.WHATSAPP_WEBHOOK_URL || '';

/**
 * Generate client-side direct WhatsApp concierge link
 */
function generateClientWhatsAppUrl(data) {
  const planLabel = data.service || data.planName || 'General Inquiry';
  const text = `Hi SIMPLE Studio! 👋

Thank you for receiving my booking! I'm excited to partner with your team.

📋 Booking Details:
• Booking ID: ${data.bookingId}
• Package: ${planLabel}
• Name: ${data.name}
${data.phone ? `• Phone: ${data.phone}\n` : ''}${data.email ? `• Email: ${data.email}\n` : ''}${data.message ? `• Requirements: ${data.message}\n` : ''}
Please share the project onboarding roadmap and asset checklist so we can get started!`;

  const encoded = encodeURIComponent(text);
  return `https://wa.me/${OWNER_PHONE.replace(/[^\d]/g, '')}?text=${encoded}`;
}

/**
 * Generate formatted text for owner WhatsApp alert
 */
function generateOwnerWhatsAppText(data) {
  const planLabel = data.service || data.planName || 'General Inquiry';
  return `🚀 *NEW BOOKING on SIMPLE!*
━━━━━━━━━━━━━━
✦ *Thank You & Lead Intake* ✦
👤 *Client:* ${data.name}
📱 *Phone:* ${data.phone}
${data.email ? `✉️ *Email:* ${data.email}\n` : ''}📋 *Plan:* ${planLabel}
${data.platformOption ? `⚙️ *Platform:* ${data.platformOption}\n` : ''}${data.message ? `📝 *Requirements:* ${data.message}\n` : ''}🆔 *Ref ID:* ${data.bookingId}
⏰ *Time:* ${new Date().toLocaleTimeString()}
━━━━━━━━━━━━━━
🏢 *SIMPLE Studio* · Make Your Work Simple
👉 *Click to WhatsApp Client:*
https://wa.me/${(data.phone || '').replace(/[^\d]/g, '')}`;
}

/**
 * Generate formatted welcome text from AI agent to client
 */
function generateClientWelcomeText(data) {
  const planLabel = data.service || data.planName || 'Digital Services';
  return `✦ *WELCOME TO SIMPLE STUDIO!* ✦
Make Your Work Simple.

Thank you for choosing SIMPLE Studio, ${data.name}! We have received your booking for *${planLabel}* (Ref: ${data.bookingId}).

🏢 *About SIMPLE:*
We create high-converting custom websites, 24/7 conversational AI agents on WhatsApp & Instagram, and targeted ad campaigns. Zero agency bloat, 100% code ownership, and 3–7 day delivery.

🚀 *Next Steps:*
Our team and AI Concierge will review your requirements and follow up within 24 business hours to kick off your project!

🌐 https://simple-chi-nine.vercel.app
✉️ simple.agency0011@gmail.com
📸 Instagram: @simple____agency`;
}

/**
 * Send WhatsApp alert to owner via CallMeBot or Webhook (if configured)
 */
async function dispatchOwnerWhatsAppAlert(data) {
  const messageText = generateOwnerWhatsAppText(data);
  const results = {
    callmebot: null,
    webhook: null
  };

  // 1. CallMeBot API (Free WhatsApp API Gateway)
  if (CALLMEBOT_API_KEY) {
    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${OWNER_PHONE}&text=${encodeURIComponent(messageText)}&apikey=${CALLMEBOT_API_KEY}`;
      results.callmebot = await new Promise((resolve) => {
        https.get(url, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => resolve({ success: res.statusCode === 200, response: body }));
        }).on('error', (err) => resolve({ success: false, error: err.message }));
      });
    } catch (e) {
      results.callmebot = { success: false, error: e.message };
    }
  }

  // 2. Custom Webhook (Make.com / n8n / Zapier)
  if (WHATSAPP_WEBHOOK_URL) {
    try {
      const parsedUrl = new URL(WHATSAPP_WEBHOOK_URL);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;
      const payload = JSON.stringify({
        event: 'booking.created',
        bookingId: data.bookingId,
        clientName: data.name,
        clientPhone: data.phone,
        clientEmail: data.email,
        plan: data.service || data.planName,
        message: data.message,
        ownerAlertText: messageText,
        submittedAt: data.createdAt
      });

      results.webhook = await new Promise((resolve) => {
        const req = client.request(parsedUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => resolve({ success: res.statusCode >= 200 && res.statusCode < 300 }));
        });
        req.on('error', (err) => resolve({ success: false, error: err.message }));
        req.write(payload);
        req.end();
      });
    } catch (e) {
      results.webhook = { success: false, error: e.message };
    }
  }

  return results;
}

module.exports = {
  OWNER_PHONE,
  generateClientWhatsAppUrl,
  generateOwnerWhatsAppText,
  generateClientWelcomeText,
  dispatchOwnerWhatsAppAlert
};
