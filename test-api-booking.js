/**
 * Test Serverless Handler POST /api/book-plan
 */

const assert = require('assert');
const bookPlanHandler = require('./api/book-plan');

async function testBookingHandler() {
  console.log('Testing /api/book-plan handler...');

  const mockReq = {
    method: 'POST',
    headers: {
      origin: 'https://simple-agency.vercel.app',
      'x-forwarded-for': '203.0.113.195'
    },
    body: {
      name: 'Vikram Mehta',
      phone: '9876543210',
      email: 'vikram@company.com',
      business: 'Mehta Tech',
      planName: 'Website + AI Agent',
      planPrice: '₹12,999+',
      note: 'Need CRM integration'
    }
  };

  let statusCode = null;
  let responseBody = null;
  const mockRes = {
    setHeader: () => {},
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          responseBody = data;
        },
        end: () => {}
      };
    }
  };

  await bookPlanHandler(mockReq, mockRes);

  assert.strictEqual(statusCode, 200, 'Status code must be 200');
  assert.strictEqual(responseBody.success, true, 'Booking response success must be true');
  assert(responseBody.booking.bookingId.startsWith('SMPL-'), 'Booking ID must start with SMPL-');
  assert.strictEqual(responseBody.booking.ownerNotificationEmail, 'simple.agency0011@gmail.com', 'Owner email must be simple.agency0011@gmail.com');
  assert.strictEqual(responseBody.booking.emailsSent.toOwner, 'simple.agency0011@gmail.com');
  assert.strictEqual(responseBody.booking.emailsSent.toClient, 'vikram@company.com');
  assert.strictEqual(responseBody.booking.emailsSent.dispatched, true);

  console.log('✓ /api/book-plan dual email dispatch handler test passed successfully!');
}

testBookingHandler().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
