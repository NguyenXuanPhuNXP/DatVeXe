const bearer = [{ bearerAuth: [] }];
const jsonBody = (schema) => ({ required: true, content: { "application/json": { schema } } });
const ok = { 200: { description: "Success" } };
const id = { name: "id", in: "path", required: true, schema: { type: "string" } };
const query = (name, schema = { type: "string" }, required = false) => ({ name, in: "query", required, schema });
const date = { type: "string", format: "date" };
const credentials = {
  type: "object", required: ["email", "password"],
  properties: { email: { type: "string", format: "email", maxLength: 254 }, password: { type: "string", minLength: 1, maxLength: 72 } },
};

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "DatVeXe API", version: "1.0.0",
    description: "Core customer APIs. Admin, operator, payment and support APIs are not documented yet. Log in, copy accessToken, then use Authorize. Refresh/logout use the HttpOnly cookie set by login. Validation errors return 400; protected endpoints require an active session (401/403).",
  },
  servers: [{ url: "/", description: "Current API server" }],
  components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
  paths: {
    "/health": { get: { tags: ["Health"], summary: "Check API availability", responses: ok } },
    "/api/operator/trip-board": { get: { tags: ["Operator"], summary: "Company trip schedule for staff", security: bearer, description: "Requires an active company membership with operator.access and operator.work. Company is always taken from the authenticated membership.", parameters: [query("date", date, true)], responses: ok } },
    "/api/operator/trip-board/{id}/seats": { get: { tags: ["Operator"], summary: "Company seat map with booking contact details", security: bearer, description: "Requires operator.work. Rejects trips belonging to another company before reading any booking contact data.", parameters: [id, query("date", date, true)], responses: { ...ok, 404: { description: "Trip is not in the caller's company" } } } },
    "/api/auth/register": { post: {
      tags: ["Auth"], summary: "Register a customer account",
      requestBody: jsonBody({ ...credentials, properties: {
        ...credentials.properties, password: { type: "string", minLength: 8, maxLength: 72, description: "Maximum 72 UTF-8 bytes" },
        fullName: { type: "string", minLength: 1, maxLength: 120 },
      } }), responses: { 201: { description: "Account created; returns accessToken and user, sets refreshToken cookie" } },
    } },
    "/api/auth/login": { post: { tags: ["Auth"], summary: "Log in", requestBody: jsonBody(credentials), responses: { 200: { description: "Returns accessToken and user, sets refreshToken cookie" } } } },
    "/api/auth/refresh": { post: { tags: ["Auth"], summary: "Refresh access token using cookie", responses: ok } },
    "/api/auth/logout": { post: { tags: ["Auth"], summary: "Log out and clear refresh cookie", responses: { 204: { description: "Logged out" } } } },
    "/api/auth/me": { get: { tags: ["Auth"], summary: "Current user", security: bearer, responses: ok } },
    "/api/auth/forgot-password": { post: {
      tags: ["Auth"], summary: "Email an 8-digit password reset code",
      description: "Requires SMTP. Generic response for unknown/locked accounts. Code expires in 10 minutes; resend at most once per minute per account. Both reset endpoints share a 10 requests/15 minutes/IP limit.",
      requestBody: jsonBody({ type: "object", required: ["email"], properties: { email: credentials.properties.email } }),
      responses: { ...ok, 429: { description: "Too many requests" }, 503: { description: "Email service is not configured" } },
    } },
    "/api/auth/reset-password": { post: {
      tags: ["Auth"], summary: "Reset password and revoke all login sessions",
      description: "Single-use code; maximum 5 attempts per code. No automatic login after reset.",
      requestBody: jsonBody({ type: "object", required: ["email", "code", "password"], properties: {
        email: credentials.properties.email, code: { type: "string", pattern: "^[0-9]{8}$" },
        password: { type: "string", minLength: 8, maxLength: 72, description: "Maximum 72 UTF-8 bytes" },
      } }), responses: { ...ok, 400: { description: "Invalid, expired or exhausted code / invalid input" }, 429: { description: "Too many requests" } },
    } },
    "/api/trips/filter-options": { get: { tags: ["Trips"], summary: "Available trip filters", responses: ok } },
    "/api/trips/search": { get: {
      tags: ["Trips"], summary: "Search trips", parameters: [
        query("origin"), query("destination"), query("date", date),
        query("minPrice", { type: "number", minimum: 0, maximum: 2147483647 }), query("maxPrice", { type: "number", minimum: 0, maximum: 2147483647 }),
        query("companies"), query("busTypes"), query("rating", { type: "number", minimum: 0, maximum: 5 }),
        query("departurePeriods", { type: "string", description: "Comma-separated: early,morning,afternoon,evening" }),
        query("sort", { type: "string", enum: ["price_asc", "price_desc", "departure_asc", "departure_desc", "rating_desc"] }),
      ], responses: ok,
    } },
    "/api/trips/{id}": { get: { tags: ["Trips"], summary: "Trip details", parameters: [id], responses: ok } },
    "/api/trips/{id}/seats": { get: { tags: ["Trips"], summary: "Seats available on a date", parameters: [id, query("date", date, true)], responses: ok } },
    "/api/bookings": { post: {
      tags: ["Bookings"], summary: "Create a customer booking", security: bearer,
      requestBody: jsonBody({
        type: "object", required: ["tripId", "tripDate", "seatCodes", "passengerName", "passengerPhone", "passengerEmail"],
        properties: {
          tripId: { type: "string", minLength: 1, maxLength: 30 }, tripDate: date,
          seatCodes: { type: "array", minItems: 1, maxItems: 40, uniqueItems: true, items: { type: "string", pattern: "^[ABC][1-9]\\d?$" } },
          passengerName: { type: "string", minLength: 1, maxLength: 120 }, passengerPhone: { type: "string", minLength: 1, maxLength: 20 },
          passengerEmail: { type: "string", description: "Email address or empty string" },
          paymentMethod: { type: "string", enum: ["cash", "bank_transfer", "vnpay"], default: "cash" },
        },
      }), responses: { 201: { description: "Booking created" } },
    } },
    "/api/bookings/my": { get: { tags: ["Bookings"], summary: "My bookings", security: bearer, responses: ok } },
    "/api/bookings/lookup": { get: { tags: ["Bookings"], summary: "Look up a booking", parameters: [query("bookingCode", { type: "string" }, true), query("phone")], responses: ok } },
    "/api/bookings/{id}": { get: { tags: ["Bookings"], summary: "Booking details", parameters: [id, query("phone")], description: "Guests must provide the booking phone number; owners may use a Bearer token.", security: [{}, ...bearer], responses: ok } },
    "/api/bookings/{id}/cancel": { patch: { tags: ["Bookings"], summary: "Cancel a booking", parameters: [id], requestBody: { content: { "application/json": { schema: { type: "object", properties: { phone: { type: "string", minLength: 1, maxLength: 20 } } } } } }, description: "Guests must provide the booking phone number in the JSON body; owners may use a Bearer token.", security: [{}, ...bearer], responses: ok } },
  },
};
