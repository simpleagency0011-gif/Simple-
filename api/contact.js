/**
 * Vercel Serverless Function: POST /api/contact
 * Handles booking and inquiry submissions:
 * 1. Validates inputs & rate limits
 * 2. Sends owner email alert via Resend
 * 3. Triggers owner WhatsApp notification
 * 4. Generates customer confirmation and WhatsApp concierge chat link
 */

const { validateSchema, bookingSchema } = require('./validator');
const rateLimiter = require('./rate-limiter');
const { isOriginAllowed, scrubPII } = require('./security-utils');
const { dispatchBookingEmails, OWNER_EMAIL } = require('./email-service');
const { generateClientWhatsAppUrl, generateClientWelcomeText, dispatchOwnerWhatsAppAlert } = require('./whatsapp-service');

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer || '';

  // CORS Headers
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://simple-chi-nine.vercel.app');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Handle CORS OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Reject non-POST methods
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
  }

  // Rate Limiting
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  const rateLimitStatus = rateLimiter.checkPublicEndpoint(clientIp);

  if (!rateLimitStatus.allowed) {
    res.setHeader('Retry-After', rateLimitStatus.retryAfter);
    return res.status(429).json({ success: false, error: rateLimitStatus.reason });
  }

  try {
    const rawData = req.body || {};

    // Honeypot bot trap check
    if (rawData.hp_trap && rawData.hp_trap.trim() !== '') {
      console.warn('[SPAM_BLOCKED] Bot hit honeypot trap.');
      return res.status(200).json({ success: true, message: 'Inquiry processed.' });
    }

    // Input validation
    const validation = validateSchema(rawData, bookingSchema);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.errors[0] || 'Invalid submission data.'
      });
    }

    const bookingData = {
      bookingId: 'SMPL-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      createdAt: new Date().toISOString(),
      name: (rawData.name || '').trim(),
      phone: (rawData.phone || '').trim(),
      email: (rawData.email || '').trim().toLowerCase(),
      service: (rawData.service || rawData.planName || 'General Inquiry').trim(),
      platformOption: (rawData.platformOption || '').trim(),
      message: (rawData.message || '').trim()
    };

    console.log('[BOOKING_RECEIVED]', scrubPII(bookingData));

    // 1. Dispatch Emails (Owner always, Client if provided)
    const emailResult = await dispatchBookingEmails(bookingData);

    // 2. Dispatch WhatsApp Alert to Owner (CallMeBot/Webhook if active)
    await dispatchOwnerWhatsAppAlert(bookingData);

    // 3. Generate instant WhatsApp Concierge URL for Client
    const whatsappConciergeUrl = generateClientWhatsAppUrl(bookingData);

    return res.status(200).json({
      success: true,
      message: "Thank you! We'll get back to you soon.",
      booking: {
        bookingId: bookingData.bookingId,
        name: bookingData.name,
        service: bookingData.service,
        whatsappConciergeUrl,
        welcomeMessage: generateClientWelcomeText(bookingData),
        emailStatus: {
          ownerDelivered: emailResult.ownerResult?.success || false,
          clientDelivered: emailResult.clientResult?.success || false
        }
      }
    });

  } catch (err) {
    console.error('[BOOKING_API_ERROR]', scrubPII({ message: err.message }));
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred. Please try contacting us on WhatsApp directly.'
    });
  }
};
