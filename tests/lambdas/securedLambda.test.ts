import { describe, expect, it } from "vitest";

import {
  type AuthedEvent,
  securedHandler,
} from "../../src/lambdas/securedLambda.js";

const makeEvent = (principalId: string): AuthedEvent =>
  ({
    requestContext: {
      authorizer: {
        lambda: { principalId },
      },
    },
  }) as unknown as AuthedEvent;

describe("GET /secured", () => {
  it("returns 200 with json content-type", async () => {
    const result = await securedHandler(makeEvent("user-123"));

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual({ "content-type": "application/json" });
  });

  it("returns the principalId from the authorizer context", async () => {
    const result = await securedHandler(makeEvent("user-123"));

    const body = JSON.parse(result.body as string);
    expect(body.principalId).toBe("user-123");
    expect(body.message).toBe("Access granted!");
  });

  it("reflects a different principalId", async () => {
    const result = await securedHandler(makeEvent("another-user-456"));

    const body = JSON.parse(result.body as string);
    expect(body.principalId).toBe("another-user-456");
  });

  it("body is valid JSON with exactly the expected shape", async () => {
    const result = await securedHandler(makeEvent("user-789"));

    const body = JSON.parse(result.body as string);
    expect(Object.keys(body).sort()).toEqual(["message", "principalId"]);
  });
});
