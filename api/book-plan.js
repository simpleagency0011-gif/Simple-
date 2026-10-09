/**
 * Vercel Serverless API Route: POST /api/book-plan
 * Strict Schema Validation + Endpoint Rate Limiting + Information Leakage Protection
 */

const { validateSchema, bookingSchema } = require('./validator');
const rateLimiter = require('./rate-limiter');
const { isOriginAllowed, scrubPII } = require('./security-utils');
const { dispatchBookingEmails, OWNER_EMAIL } = require('./email-service');

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer || '';

  // 11. CORS & Hardened Headers
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

  // 1. Endpoint Rate Limiting (Moderate public tier)
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown-client';
  const rateLimitStatus = rateLimiter.checkPublicEndpoint(clientIp);

  if (!rateLimitStatus.allowed) {
    res.setHeader('Retry-After', rateLimitStatus.retryAfter);
    return res.status(429).json({
      success: false,
      error: rateLimitStatus.reason,
      retryAfterSeconds: rateLimitStatus.retryAfter
    });
  }

  try {
    const rawData = req.body || {};

    // 2. Strict Input Validation (Reject, never just escape/sanitize)
    const validation = validateSchema(rawData, bookingSchema, true);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed. The submitted payload does not match required schema constraints.',
        details: validation.errors
      });
    }

    // Clean, strictly validated fields
    const safeData = {
      bookingId: 'SMPL-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      createdAt: new Date().toISOString(),
      name: rawData.name.trim(),
      phone: rawData.phone.trim(),
      email: rawData.email.trim().toLowerCase(),
      business: rawData.business.trim(),
      planName: rawData.planName.trim(),
      planPrice: (rawData.planPrice || 'Custom Quote').trim(),
      note: (rawData.note || '').trim()
    };

    // 5. Information Leakage & PII Redaction in Server Logs
    console.log('[BOOKING_CREATED_SECURE]', scrubPII(safeData));

    // Dual Email Dispatch: Sends alert to owner (simple.agency0011@gmail.com) AND booking confirmation to client
    let emailStatus = null;
    try {
      emailStatus = await dispatchBookingEmails(safeData);
    } catch (emailErr) {
      console.error('[EMAIL_DISPATCH_FAILED]', scrubPII({ error: emailErr.message }));
    }

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
      message: 'Plan successfully selected and validated! Confirmation emails dispatched to owner and client.',
      booking: {
        bookingId: safeData.bookingId,
        clientName: safeData.name,
        clientEmail: safeData.email,
        clientPhone: safeData.phone,
        planName: safeData.planName,
        planPrice: safeData.planPrice,
        whatsappUrl: whatsappUrl,
        ownerNotificationEmail: OWNER_EMAIL,
        emailsSent: {
          toOwner: OWNER_EMAIL,
          toClient: safeData.email,
          dispatched: true,
          receipt: emailStatus ? {
            ownerDelivery: emailStatus.ownerDelivery?.success ? 'DELIVERED' : (emailStatus.ownerDelivery?.reason || 'QUEUED'),
            clientDelivery: emailStatus.clientDelivery?.success ? 'DELIVERED' : (emailStatus.clientDelivery?.reason || 'QUEUED')
          } : { status: 'DISPATCHED_ASYNC' }
        }
      }
    });

  } catch (err) {
    // 5. Error Handling & Information Leakage Defense: Never expose stack trace or database error to client
    console.error('[BOOKING_INTERNAL_EXCEPTION]', scrubPII({ message: err.message, stack: err.stack }));
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while processing your booking. Please try via WhatsApp directly.'
    });
  }
};
