/**
 * Test Email Service Verification
 * Verifies template generation and dual-dispatch logic for Owner and Client
 */

const assert = require('assert');
const { dispatchBookingEmails, OWNER_EMAIL } = require('./api/email-service');

async function runTest() {
  console.log('Testing Email Service Dual Dispatch...');

  const sampleBooking = {
    bookingId: 'SMPL-TEST01',
    createdAt: new Date().toISOString(),
    name: 'Rohit Verma',
    phone: '9876543210',
    email: 'client.test@example.com',
    business: 'Verma Logistics',
    planName: 'Website + AI Agent + Free Ad Run',
    planPrice: '₹16,999+',
    note: 'Fast turnaround required'
  };

  const result = await dispatchBookingEmails(sampleBooking);

  // 1. Verify recipient emails
  assert.strictEqual(result.ownerEmail, 'simple.agency0011@gmail.com', 'Owner email must be simple.agency0011@gmail.com');
  assert.strictEqual(result.clientEmail, 'client.test@example.com', 'Client email must match booking email');

  // 2. Verify owner email contains all key client data
  assert(result.ownerSubject.includes('Rohit Verma'), 'Owner subject must include client name');
  assert(result.ownerSubject.includes('Website + AI Agent'), 'Owner subject must include plan name');
  assert(result.ownerHtml.includes('SMPL-TEST01'), 'Owner HTML must include booking ID');
  assert(result.ownerHtml.includes('Verma Logistics'), 'Owner HTML must include business name');
  assert(result.ownerHtml.includes('9876543210'), 'Owner HTML must include client phone');
  assert(result.ownerHtml.includes('client.test@example.com'), 'Owner HTML must include client email');

  // 3. Verify client email contains confirmation and SLA
  assert(result.clientSubject.includes('Booking Received'), 'Client subject must confirm booking');
  assert(result.clientHtml.includes('Rohit Verma'), 'Client HTML must greet client');
  assert(result.clientHtml.includes('SMPL-TEST01'), 'Client HTML must include booking ID');
  assert(result.clientHtml.includes('Within 24h'), 'Client HTML must state 24h SLA');
  assert(result.clientHtml.includes('simple.agency0011@gmail.com'), 'Client HTML must include agency contact');

  console.log('✓ All Email Service Dual Dispatch verification checks passed successfully!');
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
