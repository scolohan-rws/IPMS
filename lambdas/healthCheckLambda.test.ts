import assert from "node:assert/strict";
import test from "node:test";

import { healthCheck } from "./healthCheckLambda.js";

test("GET /health returns a successful JSON response", async () => {
  const response = await healthCheck();

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers?.["content-type"], "application/json");
  assert.deepEqual(JSON.parse(response.body ?? ""), { status: "ok" });
});
