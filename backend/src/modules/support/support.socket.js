const { WebSocketServer, WebSocket } = require("ws");
const { z } = require("zod");
const { authenticate } = require("../../middleware/authenticate");
const { isCustomer } = require("../../middleware/customer-only");
const { staffCompany } = require("./human-support.service");
const { supportEvents } = require("./support.events");

const credentialsSchema = z.object({ token: z.string().min(1).max(4096), staff: z.boolean() }).strict();

function attachSupportSocket(server) {
  const sockets = new WebSocketServer({ server, path: "/api/support/socket", maxPayload: 8192 });
  async function authorize(client) {
    const request = { header: () => `Bearer ${client.credentials.token}` };
    await new Promise((resolve, reject) => {
      Promise.resolve(authenticate(request, null, (error) => error ? reject(error) : resolve())).catch(reject);
    });
    if (client.credentials.staff) return { companyId: staffCompany(request.auth) };
    if (!isCustomer(request.auth)) throw new Error("Customer access required");
    return { customerId: request.auth.userId };
  }
  sockets.on("connection", (client) => {
    let alive = true;
    client.on("error", () => {});
    client.on("pong", () => { alive = true; });
    const authTimeout = setTimeout(() => client.close(4401, "Authentication required"), 5000);
    const heartbeat = setInterval(() => {
      if (!alive) return client.terminate();
      alive = false;
      client.ping();
    }, 30000);
    heartbeat.unref();
    client.once("close", () => { clearTimeout(authTimeout); clearInterval(heartbeat); });
    client.once("message", async (raw, binary) => {
      try {
        if (binary) throw new Error("Text authentication required");
        client.credentials = credentialsSchema.parse(JSON.parse(raw.toString()));
        await authorize(client);
        clearTimeout(authTimeout);
        if (client.readyState === WebSocket.OPEN) {
          client.authenticated = true;
          client.send(JSON.stringify({ type: "support.ready" }));
        }
      } catch { client.close(4401, "Authentication failed"); }
    });
  });
  async function notify(client, conversation) {
    try {
      // Recheck persisted session and permissions so logout/role changes stop delivery.
      const audience = await authorize(client);
      if (client.readyState === WebSocket.OPEN &&
          ((audience.customerId && audience.customerId === conversation.customerId) ||
           (audience.companyId && audience.companyId === conversation.companyId))) {
        client.send(JSON.stringify({ type: "support.updated", conversationId: conversation.id }));
      }
    } catch { client.close(4401, "Session expired"); }
  }
  const broadcast = (conversation) => {
    for (const client of sockets.clients) {
      if (client.authenticated) void notify(client, conversation);
    }
  };
  supportEvents.on("updated", broadcast);
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    supportEvents.off("updated", broadcast);
    for (const client of sockets.clients) client.terminate();
    sockets.close();
  };
  server.once("close", stop);
  return stop;
}

module.exports = { attachSupportSocket };
