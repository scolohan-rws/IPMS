import { describe, expect, it } from "vitest";

import { healthCheck } from "../../src/lambdas/healthCheckLambda.js";

describe("GET /health", () => {
  it("returns a successful JSON response", async () => {
    const response = await healthCheck();

    expect(response.statusCode).toBe(200);
    expect(response.headers?.["content-type"]).toBe("application/json");
    expect(JSON.parse(response.body ?? "")).toEqual({ status: "ok" });
  });
});
