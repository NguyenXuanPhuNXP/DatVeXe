const test = require("node:test");
const assert = require("node:assert/strict");
const prisma = {
  booking: {
    findUnique: async () => null,
    findMany: async () => [],
    findFirst: async () => null,
  },
  trip: { findUnique: async () => null },
  seatStatus: { findMany: async () => [] },
  companyMembership: { findUnique: async () => null },
  $transaction: async (fn) => fn(prisma),
};
const expiryPath=require.resolve('../src/modules/ticketing/expiry.service');
require.cache[expiryPath]={id:expiryPath,filename:expiryPath,loaded:true,exports:{expireUnpaidBookings:async()=>0,isExpired:b=>b.expiresAt ? new Date(b.expiresAt)<=new Date() : false,HOLD_MS:300000}};
const prismaPath = require.resolve("../src/lib/prisma");
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: { prisma },
};
const {
  operationalAccess,
  roles,
  bookingWhere,
} = require("../src/modules/operator/operator.routes");
const {
  updateBookingStatus,
} = require("../src/modules/admin/bookings.service");

test("company membership must be current and active; unknown operational roles fail closed", async (t) => {
  let member = null;
  t.mock.method(prisma.companyMembership, "findUnique", async (q) => {
    assert.deepEqual(q.where, { userId: "u" });
    return member;
  });
  for (const value of [
    null,
    { role: "owner", isActive: false },
    { role: "admin", isActive: true },
  ]) {
    member = value;
    let error;
    await operationalAccess({ auth: { userId: "u" } }, {}, (e) => {
      error = e;
    });
    assert.equal(error.status, 403);
  }
  for (const role of ["owner", "manager", "staff"]) {
    member = { role, isActive: true, companyId: "c" };
    const req = { auth: { userId: "u" } };
    let error;
    await operationalAccess(req, {}, (e) => {
      error = e;
    });
    assert.equal(error, undefined);
    assert.equal(req.member.companyId, "c");
  }
});
test("staff cannot administer employees; manager cannot use owner endpoints", () => {
  for (const role of ["staff", "manager"]) {
    let error;
    roles("owner")({ member: { role } }, {}, (e) => {
      error = e;
    });
    assert.equal(error.status, 403);
  }
  let error;
  roles("owner", "manager")({ member: { role: "staff" } }, {}, (e) => {
    error = e;
  });
  assert.equal(error.status, 403);
});
test("customer and booking search always preserves company scope with other filters", () => {
  const where = bookingWhere("own", {
    search: "foreign",
    status: "confirmed",
    fromDate: "2030-01-01",
    toDate: "2030-01-31",
  });
  assert.deepEqual(where.trip, { companyId: "own" });
  assert.equal(where.status, "confirmed");
  assert.equal(where.OR.length, 4);
  assert.throws(
    () => bookingWhere("own", { companyId: "foreign" }),
    (e) => e.name === "ZodError",
  );
});
test("status updates reject booking IDs from another company before writing", async (t) => {
  t.mock.method(prisma, "$transaction", async (fn) =>
    fn({
      booking: {
        findFirst: async (q) => {
          assert.deepEqual(q.where, {
            id: "foreign",
            trip: { companyId: "own" },
          });
          return null;
        },
      },
    }),
  );
  await assert.rejects(updateBookingStatus("foreign", "confirmed", "own"), {
    status: 404,
  });
});
