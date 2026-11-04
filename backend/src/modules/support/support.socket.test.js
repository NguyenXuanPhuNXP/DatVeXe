const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { once } = require("node:events");
const { WebSocket } = require("ws");
const sessions = require("../../models/auth/session.model");
const { createAccessToken } = require("../../utils/tokens");
const { supportEvents } = require("./support.events");

test("Support sockets authenticate, isolate customers/companies and stop revoked sessions", async (t) => {
  const active = new Map();
  function session(id, permission, companyId) {
    active.set(id, { userId: id, user: { id, email: `${id}@example.test`, isLocked: false,
      roles: [{ role: { name: "TEST", permissions: permission.map(key => ({ permission: { key } })) } }],
      companyMembership: companyId ? { isActive: true, companyId } : null,
    } });
  }
  session("customer", ["booking.create"]);
  session("other", ["booking.create"]);
  session("staff", ["operator.support"], "company1");
  session("otherStaff", ["operator.support"], "company2");
  t.mock.method(sessions, "findActiveSessionById", async (sid, userId) => sid === userId ? active.get(sid) : null);
  t.mock.method(sessions, "findLockedSessionById", async () => null);
  const { attachSupportSocket } = require("./support.socket");
  const server = createServer();
  const stop = attachSupportSocket(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => { stop(); await new Promise(resolve => server.close(resolve)); });
  const url = `ws://127.0.0.1:${server.address().port}/api/support/socket`;
  async function connect(id, staff = false) {
    const client = new WebSocket(url);
    client.received = [];
    client.on("message", raw => client.received.push(JSON.parse(raw)));
    await once(client, "open");
    const ready = once(client, "message");
    client.send(JSON.stringify({ token: createAccessToken(id, id), staff }));
    const [raw] = await ready;
    assert.equal(JSON.parse(raw).type, "support.ready");
    return client;
  }
  const customer = await connect("customer");
  const other = await connect("other");
  const staff = await connect("staff", true);
  const otherStaff = await connect("otherStaff", true);
  const event = { id: "conversation1", customerId: "customer", companyId: "company1" };
  const expected = [once(customer, "message"), once(staff, "message")];
  supportEvents.emit("updated", event);
  const received = await Promise.all(expected);
  for (const [raw] of received) assert.deepEqual(JSON.parse(raw), { type: "support.updated", conversationId: event.id });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(other.received.length, 1);
  assert.equal(otherStaff.received.length, 1);

  const bad = new WebSocket(url);
  await once(bad, "open");
  const denied = once(bad, "close");
  bad.send(JSON.stringify({ token: createAccessToken("customer", "customer"), staff: true }));
  assert.equal((await denied)[0], 4401);
  const anonymous = new WebSocket(url);
  await once(anonymous, "open");
  const rejected = once(anonymous, "close");
  anonymous.send(JSON.stringify({ token: "invalid", staff: false }));
  assert.equal((await rejected)[0], 4401);

  active.delete("customer");
  active.get("staff").user.companyMembership.isActive = false;
  const disconnected = [once(customer, "close"), once(staff, "close")];
  supportEvents.emit("updated", event);
  for (const result of await Promise.all(disconnected)) assert.equal(result[0], 4401);
  assert.equal(customer.received.length, 2, "Revoked clients receive no further events");
});

test("HTTP support writes publish only after successful commit and preserve response shape", async (t) => {
  const human = require("./human-support.service");
  const conversation = { id: "c1", customerId: "customer", companyId: "company1" };
  const auth = { userId: "customer" };
  const events = [];
  const listener = (value) => events.push(value);
  supportEvents.on("updated", listener);
  t.after(() => supportEvents.off("updated", listener));
  let committed = false;
  const db = {
    busCompany: { findFirst: async () => ({ id: "company1" }) },
    supportConversation: { create: async () => conversation, findFirst: async () => conversation, updateMany: async () => ({ count: 1 }) },
    supportMessage: { create: async () => ({ id: "m1", content: "Reply" }) },
    $transaction: async (fn) => { const result = await fn(db); assert.equal(events.length, 1); committed = true; return result; },
  };
  assert.equal((await human.create(auth, { companyId: "company1", content: "Hello" }, db)).id, "c1");
  assert.deepEqual(await human.reply(auth, "c1", false, { content: "Reply" }, db), { id: "m1", content: "Reply" });
  assert.equal(committed, true);
  assert.equal(events.length, 2);
  await human.close(auth, "c1", false, db);
  assert.equal(events.length, 3);
  db.$transaction = async () => { throw new Error("Transaction failed"); };
  await assert.rejects(human.reply(auth, "c1", false, { content: "Reply" }, db));
  assert.equal(events.length, 3);
});
