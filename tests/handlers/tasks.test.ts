import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError } from "../../src/lib/errors.js";
import {
  createTaskHandlers,
  createTasksRouter,
} from "../../src/handlers/tasks.js";
import {
  makeContext,
  makeReqCtx,
  makeTask,
  makeTaskService,
  makeV2Event,
} from "../helpers/fixtures.js";

let service: ReturnType<typeof makeTaskService>;
let handlers: ReturnType<typeof createTaskHandlers>;

const bodyOf = (res: { body?: string }) => JSON.parse(res.body ?? "null");

beforeEach(() => {
  service = makeTaskService();
  handlers = createTaskHandlers(service);
});

describe("create", () => {
  it("creates a task and returns 201 with the created row", async () => {
    const task = makeTask({ id: 42, title: "Ship it" });
    service.create.mockResolvedValue(task);

    const res = await handlers.create(
      makeReqCtx({ body: JSON.stringify({ title: "Ship it" }) }),
    );

    expect(res.statusCode).toBe(201);
    expect(bodyOf(res)).toMatchObject({ id: 42, title: "Ship it" });
  });

  it("applies schema defaults before calling the use case", async () => {
    service.create.mockResolvedValue(makeTask());

    await handlers.create(
      makeReqCtx({ body: JSON.stringify({ title: "  Trim me  " }) }),
    );

    expect(service.create).toHaveBeenCalledWith({
      title: "Trim me",
      status: "todo",
      priority: 3,
    });
  });

  it("coerces dueAt to a Date", async () => {
    service.create.mockResolvedValue(makeTask());

    await handlers.create(
      makeReqCtx({
        body: JSON.stringify({ title: "x", dueAt: "2026-12-01T10:00:00.000Z" }),
      }),
    );

    const [input] = service.create.mock.calls[0];
    expect(input.dueAt).toBeInstanceOf(Date);
    expect((input.dueAt as Date).toISOString()).toBe(
      "2026-12-01T10:00:00.000Z",
    );
  });

  it("rejects a body that fails validation with 400", async () => {
    const res = await handlers.create(
      makeReqCtx({ body: JSON.stringify({ title: "" }) }),
    );

    expect(res.statusCode).toBe(400);
    expect(bodyOf(res).error).toBe("Validation failed");
    expect(service.create).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await handlers.create(makeReqCtx({ body: "{not json" }));

    expect(res.statusCode).toBe(400);
    expect(bodyOf(res).error).toBe("Request body is not valid JSON");
  });

  // The V1 arm of the RequestContext union types `body` as `string | null`.
  it("treats a null body as an empty object and 400s on the missing title", async () => {
    const res = await handlers.create(makeReqCtx({ body: null }));

    expect(res.statusCode).toBe(400);
    expect(bodyOf(res).error).toBe("Validation failed");
  });

  it("returns 500 without leaking details when the use case throws", async () => {
    service.create.mockRejectedValue(new Error("connection terminated"));

    const res = await handlers.create(
      makeReqCtx({ body: JSON.stringify({ title: "x" }) }),
    );

    expect(res.statusCode).toBe(500);
    expect(bodyOf(res)).toEqual({ error: "Internal server error" });
  });
});

describe("list", () => {
  it("reads pagination from the query string and echoes it back", async () => {
    service.list.mockResolvedValue([makeTask()]);

    const res = await handlers.list(
      makeReqCtx({ query: { status: "done", limit: "5", offset: "10" } }),
    );

    expect(res.statusCode).toBe(200);
    expect(service.list).toHaveBeenCalledWith({
      status: "done",
      limit: 5,
      offset: 10,
    });
    expect(bodyOf(res)).toMatchObject({ limit: 5, offset: 10 });
    expect(bodyOf(res).items).toHaveLength(1);
  });

  it("defaults to limit 20 / offset 0 when the query string is absent", async () => {
    service.list.mockResolvedValue([]);

    const res = await handlers.list(makeReqCtx({ query: null }));

    expect(res.statusCode).toBe(200);
    expect(service.list).toHaveBeenCalledWith({ limit: 20, offset: 0 });
  });

  it("rejects an unknown status with 400", async () => {
    const res = await handlers.list(
      makeReqCtx({ query: { status: "archived" } }),
    );

    expect(res.statusCode).toBe(400);
    expect(service.list).not.toHaveBeenCalled();
  });

  it("rejects a limit above the cap with 400", async () => {
    const res = await handlers.list(makeReqCtx({ query: { limit: "500" } }));

    expect(res.statusCode).toBe(400);
  });
});

describe("get", () => {
  it("reads the id from route params and coerces it to a number", async () => {
    service.get.mockResolvedValue(makeTask({ id: 7 }));

    const res = await handlers.get(makeReqCtx({ params: { id: "7" } }));

    expect(res.statusCode).toBe(200);
    expect(service.get).toHaveBeenCalledWith(7);
  });

  it("uses route params, not the event's pathParameters", async () => {
    service.get.mockResolvedValue(makeTask({ id: 7 }));

    const res = await handlers.get(
      makeReqCtx({ params: { id: "7" }, pathParameters: { proxy: "7" } }),
    );

    expect(res.statusCode).toBe(200);
    expect(service.get).toHaveBeenCalledWith(7);
  });

  it("maps NotFoundError to 404 and keeps its message", async () => {
    service.get.mockRejectedValue(new NotFoundError("Task 99 not found"));

    const res = await handlers.get(makeReqCtx({ params: { id: "99" } }));

    expect(res.statusCode).toBe(404);
    expect(bodyOf(res).error).toBe("Task 99 not found");
  });

  it("rejects a non-numeric id with 400", async () => {
    const res = await handlers.get(makeReqCtx({ params: { id: "abc" } }));

    expect(res.statusCode).toBe(400);
    expect(service.get).not.toHaveBeenCalled();
  });

  it("rejects a negative id with 400", async () => {
    const res = await handlers.get(makeReqCtx({ params: { id: "-1" } }));

    expect(res.statusCode).toBe(400);
  });
});

describe("update", () => {
  it("updates and returns 200 with the updated row", async () => {
    service.update.mockResolvedValue(makeTask({ id: 5, title: "Updated" }));

    const res = await handlers.update(
      makeReqCtx({
        params: { id: "5" },
        body: JSON.stringify({ title: "Updated" }),
      }),
    );

    expect(res.statusCode).toBe(200);
    expect(service.update).toHaveBeenCalledWith(5, { title: "Updated" });
    expect(bodyOf(res)).toMatchObject({ title: "Updated" });
  });

  it("does not inject defaults for fields the caller omitted", async () => {
    service.update.mockResolvedValue(makeTask({ id: 5 }));

    await handlers.update(
      makeReqCtx({
        params: { id: "5" },
        body: JSON.stringify({ title: "Only the title" }),
      }),
    );

    const [, patch] = service.update.mock.calls[0];
    expect(Object.keys(patch)).toEqual(["title"]);
    expect(patch).not.toHaveProperty("status");
    expect(patch).not.toHaveProperty("priority");
  });

  it("still accepts an explicit status/priority in the patch", async () => {
    service.update.mockResolvedValue(makeTask({ id: 5 }));

    await handlers.update(
      makeReqCtx({
        params: { id: "5" },
        body: JSON.stringify({ status: "review", priority: 1 }),
      }),
    );

    expect(service.update).toHaveBeenCalledWith(5, {
      status: "review",
      priority: 1,
    });
  });

  it("rejects an empty patch with 400", async () => {
    const res = await handlers.update(
      makeReqCtx({ params: { id: "5" }, body: "{}" }),
    );

    expect(res.statusCode).toBe(400);
    expect(service.update).not.toHaveBeenCalled();
  });

  it("maps NotFoundError to 404", async () => {
    service.update.mockRejectedValue(new NotFoundError("Task 5 not found"));

    const res = await handlers.update(
      makeReqCtx({ params: { id: "5" }, body: JSON.stringify({ title: "x" }) }),
    );

    expect(res.statusCode).toBe(404);
  });
});

describe("remove", () => {
  it("returns 204 with no body", async () => {
    service.remove.mockResolvedValue(undefined);

    const res = await handlers.remove(makeReqCtx({ params: { id: "5" } }));

    expect(res.statusCode).toBe(204);
    expect(res.body).toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith(5);
  });

  it("maps NotFoundError to 404", async () => {
    service.remove.mockRejectedValue(new NotFoundError("Task 5 not found"));

    const res = await handlers.remove(makeReqCtx({ params: { id: "5" } }));

    expect(res.statusCode).toBe(404);
    expect(bodyOf(res).error).toBe("Task 5 not found");
  });
});

describe("createTasksRouter", () => {
  const invoke = (opts: Parameters<typeof makeV2Event>[0]) =>
    createTasksRouter(service).resolve(makeV2Event(opts), makeContext());

  it("routes GET /tasks/all to the list use case", async () => {
    service.list.mockResolvedValue([makeTask()]);

    const res = await invoke({ method: "GET", path: "/tasks/all" });

    expect(res.statusCode).toBe(200);
    expect(service.list).toHaveBeenCalled();
    expect(service.get).not.toHaveBeenCalled();
  });

  it("routes GET /tasks/5 to the get use case with the captured id", async () => {
    service.get.mockResolvedValue(makeTask({ id: 5 }));

    const res = await invoke({ method: "GET", path: "/tasks/5" });

    expect(res.statusCode).toBe(200);
    expect(service.get).toHaveBeenCalledWith(5);
    expect(JSON.parse(res.body ?? "null")).toMatchObject({ id: 5 });
  });

  it("routes POST /tasks/create to the create use case", async () => {
    service.create.mockResolvedValue(makeTask({ id: 9 }));

    const res = await invoke({
      method: "POST",
      path: "/tasks/create",
      body: JSON.stringify({ title: "New" }),
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body ?? "null")).toMatchObject({ id: 9 });
  });

  it("returns 404 for an unregistered path", async () => {
    const res = await invoke({ method: "GET", path: "/tasks/5/history" });

    expect(res.statusCode).toBe(404);
  });

  it("passes the parsed query string through to the use case", async () => {
    service.list.mockResolvedValue([]);

    const res = await invoke({
      method: "GET",
      path: "/tasks/all",
      rawQueryString: "status=done&limit=5",
      query: { status: "done", limit: "5" },
    });

    expect(res.statusCode).toBe(200);
    expect(service.list).toHaveBeenCalledWith({
      status: "done",
      limit: 5,
      offset: 0,
    });
  });

  it("returns a real 204 with an empty body for DELETE /tasks/:id", async () => {
    service.remove.mockResolvedValue(undefined);

    const res = await invoke({ method: "DELETE", path: "/tasks/5" });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBeFalsy();
    expect(service.remove).toHaveBeenCalledWith(5);
  });

  it("converts a use case failure into a 500 rather than throwing", async () => {
    service.get.mockRejectedValue(new Error("connection terminated"));

    const res = await invoke({ method: "GET", path: "/tasks/5" });

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body ?? "null")).toEqual({
      error: "Internal server error",
    });
  });
});
