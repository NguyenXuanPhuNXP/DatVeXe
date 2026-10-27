const test = require('node:test');
const assert = require('node:assert/strict');
let records = [];
const prisma = { trip: { findMany: async () => records } };
const prismaPath = require.resolve('../src/lib/prisma');
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: { prisma } };
const expiryPath = require.resolve('../src/modules/ticketing/expiry.service');
require.cache[expiryPath] = { id: expiryPath, filename: expiryPath, loaded: true, exports: { expireUnpaidBookings: async () => {} } };
const { searchTripsService } = require('../src/modules/trips/trips.service');

test('search excludes past departures, including the exact departure minute in Vietnam', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-27T10:00:00+07:00').getTime() });
  records = [
    { id: 'past', departureTime: '09:59', availableDate: null },
    { id: 'now', departureTime: '10:00', availableDate: null },
    { id: 'future', departureTime: '10:01', availableDate: null },
    { id: 'tomorrow', departureTime: '08:00', availableDate: new Date('2026-10-28T00:00:00Z') },
  ];
  assert.deepEqual((await searchTripsService({})).map(t => t.id), ['future', 'tomorrow']);
  assert.deepEqual(await searchTripsService({ date: new Date('2026-10-26T00:00:00Z') }), []);
  records = [{ id: 'daily', departureTime: '08:00', availableDate: null }];
  assert.equal((await searchTripsService({ date: new Date('2026-10-28T00:00:00Z') })).length, 1);
});
