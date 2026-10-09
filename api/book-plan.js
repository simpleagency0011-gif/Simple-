/**
 * Vercel Serverless API Route: POST /api/book-plan
 * Secure Plan Booking, Email Notification, and WhatsApp AI Assistant Linker
 */

const {
  sanitizeText,
  validateEmail,
  validatePhone,
  checkRateLimit,
  isOriginAllowed,
  scrubPII
} = require('./security-utils');

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer || '';

  // 11. CORS Tightening
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://simple-agency.vercel.app');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, X-CSRF-Token');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Enforce HTTP POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST.'
    });
  }

  // 6. Sliding Window Rate Limiting (5 requests per 15 minutes per IP)
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown-client';
  const rateLimit = checkRateLimit(clientIp, 5, 15 * 60 * 1000);

  if (!rateLimit.isAllowed) {
    return res.status(429).json({
      success: false,
      error: `Too many booking requests. Please wait ${rateLimit.resetInSeconds} seconds before trying again.`
    });
  }

  try {
    const { name, phone, email, business, planName, planPrice, note } = req.body || {};

    // Strict validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Please provide a valid full name.' });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit WhatsApp or mobile number.' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    if (!planName || typeof planName !== 'string') {
      return res.status(400).json({ success: false, error: 'Please select a valid service package.' });
    }

    // 1 & 2. Sanitize all incoming fields to stop XSS and Injection
    const safeData = {
      bookingId: 'SMPL-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      createdAt: new Date().toISOString(),
      name: sanitizeText(name, 100),
      phone: sanitizeText(phone, 20),
      email: sanitizeText(email, 120),
      business: sanitizeText(business || 'General Business', 100),
      planName: sanitizeText(planName, 120),
      planPrice: sanitizeText(planPrice || 'Custom Quote', 50),
      note: sanitizeText(note || '', 300)
    };

    // 19. Scrub PII before logging to monitoring tools
    console.log('[BOOKING_CREATED]', scrubPII(safeData));

    // Construct formatted WhatsApp message for owner (+919407928737)
    const rawWaMessage = `Hi SIMPLE Agency! 👋
I would like to confirm my booking:
📋 Plan: ${safeData.planName}
💰 Price: ${safeData.planPrice}
👤 Name: ${safeData.name}
📱 Phone: ${safeData.phone}
✉️ Email: ${safeData.email}
🏢 Business: ${safeData.business}
${safeData.note ? `📝 Note: ${safeData.note}\n` : ''}
Please share the onboarding details & start process!`;

    const waEncoded = encodeURIComponent(rawWaMessage);
    const whatsappUrl = `https://wa.me/919407928737?text=${waEncoded}`;

    // Return sanitized booking confirmation and action payloads
    return res.status(200).json({
      success: true,
      message: 'Plan successfully selected and booked!',
      booking: {
        bookingId: safeData.bookingId,
        clientName: safeData.name,
        clientEmail: safeData.email,
        clientPhone: safeData.phone,
        planName: safeData.planName,
        planPrice: safeData.planPrice,
        whatsappUrl: whatsappUrl,
        ownerNotificationEmail: 'simple.agency0011@gmail.com'
      }
    });

  } catch (err) {
    // Keep error stack traces internal (Security Best Practice)
    console.error('[BOOKING_ERROR]', err.message);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while processing your booking. Please try via WhatsApp directly.'
    });
  }
};
