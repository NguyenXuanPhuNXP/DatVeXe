// Read-only contract tests against the source used by origin/Develops.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../../backend');
const load = file => require(path.join(root, 'src', file));
const {authorizationFor} = load('modules/auth/database-authorization');
const {isCustomer} = load('middleware/customer-only');
const {createBookingSchema} = load('modules/bookings/bookings.schemas');
const {tripSearchSchema} = load('modules/trips/trips.schemas');
const {createTripSchema} = load('modules/admin/trip-management.schemas');
const {createUserSchema} = load('modules/admin/users.schemas');
const permission = key => ({permission:{key}});
test('Develops authorization reads grants from role definitions rather than names',()=>{
  const user={roles:[{role:{name:'USER',permissions:[permission('booking.create')]}}],companyMembership:{isActive:true,roleDefinition:{name:'CUSTOM_STAFF',permissions:[permission('operator.access'),permission('operator.support')]}}};
  const grants=authorizationFor(user);assert.ok(grants.permissions.includes('operator.support'));assert.equal(isCustomer({...grants,companyMembership:user.companyMembership}),false);
  assert.equal(isCustomer({permissions:['booking.create'],companyMembership:null}),true);
});
test('Booking client JSON preserves selected date and canonical seat list',()=>{
  const booking=createBookingSchema.parse({tripId:'t1',tripDate:'2026-11-02',seatCodes:['A1','B2'],passengerName:'QA',passengerPhone:'0901234567',passengerEmail:'qa@example.com',paymentMethod:'cash'});
  assert.equal(booking.tripDate.toISOString(),'2026-11-02T00:00:00.000Z');assert.deepEqual(booking.seatCodes,['A1','B2']);
  assert.equal(createBookingSchema.safeParse({...booking,tripDate:'2026-02-30'}).success,false);
});
test('Search uses CSV and rejects frontend-only passenger metadata as API query',()=>{
  const result=tripSearchSchema.parse({date:'2026-11-02',companies:'Phương Trang,Rightway',departurePeriods:'morning,evening'});assert.equal(result.companies.length,2);
  assert.equal(tripSearchSchema.safeParse({passengers:'2'}).success,false);
});
test('Management payloads use numbers and booleans, not form strings',()=>{
  const trip={routeId:'r1',busId:'b1',companyId:'c1',departureTime:'08:00',arrivalTime:'13:30',duration:'5h 30p',price:350000,availableDate:null,isActive:true};
  assert.equal(createTripSchema.safeParse(trip).success,true);assert.equal(createTripSchema.safeParse({...trip,price:'350000'}).success,false);
  assert.equal(createUserSchema.safeParse({email:'qa@example.com',fullName:'QA',password:'password123',roles:['USER']}).success,true);
});
