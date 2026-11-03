const { test } = require("node:test");
const assert = require("node:assert/strict");
const { app } = require("../app");

test("Swagger serves its document, UI and local assets without a database", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const specResponse = await fetch(`${base}/api-docs.json`);
  assert.equal(specResponse.status, 200);
  const spec = await specResponse.json();
  assert.equal(spec.openapi, "3.0.3");
  assert.equal(spec.servers[0].url, "/");
  assert.equal(spec.components.securitySchemes.bearerAuth.scheme, "bearer");
  assert.ok(spec.paths["/api/auth/login"].post.requestBody);
  const page = await fetch(`${base}/api-docs/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /swagger-ui-init.js/);
  assert.doesNotMatch(page.headers.get("content-security-policy"), /upgrade-insecure-requests/);
  for (const asset of ["swagger-ui.css", "swagger-ui-bundle.js", "swagger-ui-init.js"]) {
    const response = await fetch(`${base}/api-docs/${asset}`);
    assert.equal(response.status, 200);
  }
  const health = await fetch(`${base}/health`);
  assert.match(health.headers.get("content-security-policy"), /upgrade-insecure-requests/);
});
