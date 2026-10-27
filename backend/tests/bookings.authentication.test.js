const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { bookingsRouter } = require('../src/modules/bookings/bookings.routes');

test('booking creation rejects anonymous requests before parsing or writing a booking', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/bookings', bookingsRouter);
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ code: error.code }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/bookings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'forged-user', paymentStatus: 'paid' }),
    });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, 'UNAUTHORIZED');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
