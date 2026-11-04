const { test } = require('node:test');
const assert = require('node:assert/strict');
const board = require('./trip-board.service');

test('Staff trip board is scoped to its company and selected recurring/specific date', async () => {
  let query;
  const db = { trip: { findMany: async (input) => { query = input; return []; } } };
  await board.trips('company-a', '2026-11-04', db);
  assert.equal(query.where.companyId, 'company-a');
  assert.equal(query.where.OR[0].availableDate.toISOString(), '2026-11-04T00:00:00.000Z');
  assert.equal(query.where.OR[1].availableDate, null);
});

test('Seat board rejects another company before querying private bookings', async () => {
  let loaded = false;
  const db = { trip: { findFirst: async ({ where }) => { assert.deepEqual(where, { id: 'trip-b', companyId: 'company-a' }); return null; } } };
  await assert.rejects(board.seats('company-a', 'trip-b', '2026-11-04', db, async () => { loaded = true; }), { code: 'TRIP_NOT_FOUND' });
  assert.equal(loaded, false);
});

test('Seat details use the requested date, ignore cancellations and handle legacy padded seat codes', async () => {
  const booking = { bookingCode: 'B1', seatCode: 'A01, B2', passengerName: 'Khách', passengerPhone: '0912345678', status: 'confirmed', paymentStatus: 'paid' };
  const db = {
    trip: { findFirst: async () => ({ id: 'trip-a', availableDate: null }) },
    booking: { findMany: async ({ where }) => {
      assert.equal(where.trip.companyId, 'company-a');
      assert.equal(where.tripId, 'trip-a');
      assert.equal(where.tripDate.toISOString(), '2026-11-04T00:00:00.000Z');
      assert.deepEqual(where.status, { not: 'cancelled' });
      return [booking];
    } },
  };
  const result = await board.seats('company-a', 'trip-a', '2026-11-04', db, async () => [
    { seatCode: 'A1', status: 'booked' }, { seatCode: 'B2', status: 'booked' }, { seatCode: 'C1', status: 'available' },
  ]);
  assert.deepEqual(result.seats[0].bookings, [booking]);
  assert.deepEqual(result.seats[1].bookings, [booking]);
  assert.deepEqual(result.seats[2].bookings, []);
  const duplicate = { ...booking, bookingCode: 'B2', seatCode: 'A1' };
  db.booking.findMany = async () => [booking, duplicate];
  const duplicateResult = await board.seats('company-a', 'trip-a', '2026-11-04', db, async () => [{ seatCode: 'A1', status: 'booked' }]);
  assert.deepEqual(duplicateResult.seats[0].bookings.map(entry => entry.bookingCode), ['B1', 'B2']);
  db.trip.findFirst = async () => ({ id: 'trip-a', availableDate: new Date('2026-11-03T00:00:00Z') });
  await assert.rejects(board.seats('company-a', 'trip-a', '2026-11-04', db), { code: 'TRIP_DATE_UNAVAILABLE' });
});
