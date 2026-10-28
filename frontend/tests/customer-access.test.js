import test from 'node:test';
import assert from 'node:assert/strict';
import { isCustomerUser, userHome } from '../src/context/auth-context.js';

test('only authenticated customer accounts can use customer features', () => {
  assert.equal(isCustomerUser(null), false);
  assert.equal(isCustomerUser({ roles: [] }), false);
  assert.equal(isCustomerUser({ roles: ['USER'] }), true);
  assert.equal(userHome({ roles: ['USER'] }), '/');
  for (const role of ['owner', 'manager', 'staff']) {
    const user = { roles: ['USER'], companyMembership: { role, isActive: true } };
    assert.equal(isCustomerUser(user), false);
    assert.equal(userHome(user), role === 'owner' ? '/company/bookings' : '/staff/bookings');
  }
  assert.equal(isCustomerUser({ roles: ['USER', 'ADMIN'] }), false);
  assert.equal(userHome({ roles: ['USER', 'ADMIN'] }), '/admin');
});
test('inactive or unassigned internal accounts cannot fall back to customer pages', () => {
  for (const user of [
    { roles: ['USER'], companyMembership: { role: 'staff', isActive: false } },
    { roles: ['STAFF'] }, { roles: [] },
    { roles: ['USER'], companyMembership: { role: 'unknown', isActive: true } },
  ]) {
    assert.equal(isCustomerUser(user), false);
    assert.equal(userHome(user), '/access-denied');
  }
});
