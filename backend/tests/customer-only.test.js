const test = require('node:test');
const assert = require('node:assert/strict');
const { isCustomer, customerOnly, customerOrGuest } = require('../src/middleware/customer-only');
test('customer-only API distinguishes internal accounts even with USER role', () => {
  assert.equal(isCustomer({ roles: ['USER'] }), true);
  for (const auth of [undefined, { roles: [] }, { roles: ['USER', 'ADMIN'] },
    { roles: ['USER'], companyMembership: { role: 'staff', isActive: true } },
    { roles: ['USER'], companyMembership: { role: 'staff', isActive: false } }]) {
    assert.equal(isCustomer(auth), false);
    customerOnly({ auth }, {}, error => assert.equal(error.code, 'CUSTOMER_ONLY'));
  }
  customerOrGuest({}, {}, error => assert.equal(error, undefined));
});
