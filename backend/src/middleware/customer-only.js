const { HttpError } = require('../utils/http-error');
function isCustomer(auth) {
  return Boolean(auth && !auth.companyMembership && auth.roles?.length &&
    auth.roles.every(role => String(role).toUpperCase() === 'USER'));
}
function customerOnly(req, _res, next) {
  if (!isCustomer(req.auth)) return next(new HttpError(403, 'CUSTOMER_ONLY', 'Chức năng này chỉ dành cho tài khoản khách hàng.'));
  next();
}
function customerOrGuest(req, res, next) {
  if (!req.auth) return next();
  return customerOnly(req, res, next);
}
module.exports = { isCustomer, customerOnly, customerOrGuest };
