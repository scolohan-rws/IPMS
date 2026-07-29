import { test } from "node:test";
import assert from "node:assert/strict";
import { securedHandler, type AuthedEvent } from "./secured.js";

const makeEvent = (principalId: string): AuthedEvent =>
    ({
        requestContext: {
            authorizer: {
                lambda: { principalId },
            },
        },
    }) as unknown as AuthedEvent;

test("securedHandler returns 200 with json content-type", async () => {
    const result = await securedHandler(makeEvent("user-123"));

    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.headers, { "content-type": "application/json" });
});

test("securedHandler returns the principalId from the authorizer context", async () => {
    const result = await securedHandler(makeEvent("user-123"));

    const body = JSON.parse(result.body as string);
    assert.equal(body.principalId, "user-123");
    assert.equal(body.message, "Access granted!");
});

test("securedHandler reflects a different principalId", async () => {
    const result = await securedHandler(makeEvent("another-user-456"));

    const body = JSON.parse(result.body as string);
    assert.equal(body.principalId, "another-user-456");
});

test("securedHandler body is valid JSON with exactly the expected shape", async () => {
    const result = await securedHandler(makeEvent("user-789"));

    const body = JSON.parse(result.body as string);
    assert.deepEqual(Object.keys(body).sort(), ["message", "principalId"]);
});