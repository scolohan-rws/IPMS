import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeReqCtx, makeTask } from "../helpers/fixtures.js";

vi.mock("../../src/db/index.js", () => ({ db: {} }));
vi.mock("../../src/data/tasks.js", () => ({
  createTask: vi.fn(),
  getTaskById: vi.fn(),
  listTasks: vi.fn(),
  listUpcomingTasks: vi.fn(),
  updateTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  deleteTask: vi.fn(),
}));

import * as taskDal from "../../src/data/tasks.js";
import {
  createTaskHandler,
  deleteTaskHandler,
  getTaskHandler,
  listTasksHandler,
  updateTaskHandler,
} from "../../src/handlers/tasks.js";

const dal = vi.mocked(taskDal);

const bodyOf = (res: { body?: string }) => JSON.parse(res.body ?? "null");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("createTaskHandler", () => {
  it("creates a task and returns 201 with the created row", async () => {
    const task = makeTask({ id: 42, title: "Ship it" });
    dal.createTask.mockResolvedValue(task);

    const res = await createTaskHandler(
      makeReqCtx({ body: JSON.stringify({ title: "Ship it" }) }),
    );

    expect(res.statusCode).toBe(201);
    expect(bodyOf(res)).toMatchObject({ id: 42, title: "Ship it" });
  });

  it("applies schema defaults before hitting the DAL", async () => {
    dal.createTask.mockResolvedValue(makeTask());

    await createTaskHandler(
      makeReqCtx({ body: JSON.stringify({ title: "  Trim me  " }) }),
    );

    expect(dal.createTask).toHaveBeenCalledWith(
      {},
      { title: "Trim me", status: "todo", priority: 3 },
    );
  });

  it("coerces dueAt to a Date", async () => {
    dal.createTask.mockResolvedValue(makeTask());

    await createTaskHandler(
      makeReqCtx({
        body: JSON.stringify({ title: "x", dueAt: "2026-12-01T10:00:00.000Z" }),
      }),
    );

    const [, input] = dal.createTask.mock.calls[0];
    expect(input.dueAt).toBeInstanceOf(Date);
    expect((input.dueAt as Date).toISOString()).toBe(
      "2026-12-01T10:00:00.000Z",
    );
  });

  it("rejects a body that fails validation with 400", async () => {
    const res = await createTaskHandler(
      makeReqCtx({ body: JSON.stringify({ title: "" }) }),
    );

    expect(res.statusCode).toBe(400);
    expect(bodyOf(res).error).toBe("Validation failed");
    expect(dal.createTask).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await createTaskHandler(makeReqCtx({ body: "{not json" }));

    expect(res.statusCode).toBe(400);
    expect(bodyOf(res).error).toBe("Request body is not valid JSON");
  });

  // The V1 arm of the RequestContext union types `body` as `string | null`.
  it("treats a null body as an empty object and 400s on the missing title", async () => {
    const res = await createTaskHandler(makeReqCtx({ body: null }));

    expect(res.statusCode).toBe(400);
    expect(bodyOf(res).error).toBe("Validation failed");
  });

  it("returns 500 without leaking details when the DAL throws", async () => {
    dal.createTask.mockRejectedValue(new Error("connection terminated"));

    const res = await createTaskHandler(
      makeReqCtx({ body: JSON.stringify({ title: "x" }) }),
    );

    expect(res.statusCode).toBe(500);
    expect(bodyOf(res)).toEqual({ error: "Internal server error" });
  });
});

describe("listTasksHandler", () => {
  it("reads pagination from the query string and echoes it back", async () => {
    dal.listTasks.mockResolvedValue([makeTask()]);

    const res = await listTasksHandler(
      makeReqCtx({ query: { status: "done", limit: "5", offset: "10" } }),
    );

    expect(res.statusCode).toBe(200);
    expect(dal.listTasks).toHaveBeenCalledWith(
      {},
      { status: "done", limit: 5, offset: 10 },
    );
    expect(bodyOf(res)).toMatchObject({ limit: 5, offset: 10 });
    expect(bodyOf(res).items).toHaveLength(1);
  });

  it("defaults to limit 20 / offset 0 when the query string is absent", async () => {
    dal.listTasks.mockResolvedValue([]);

    const res = await listTasksHandler(makeReqCtx({ query: null }));

    expect(res.statusCode).toBe(200);
    expect(dal.listTasks).toHaveBeenCalledWith({}, { limit: 20, offset: 0 });
  });

  it("rejects an unknown status with 400", async () => {
    const res = await listTasksHandler(
      makeReqCtx({ query: { status: "archived" } }),
    );

    expect(res.statusCode).toBe(400);
    expect(dal.listTasks).not.toHaveBeenCalled();
  });

  it("rejects a limit above the cap with 400", async () => {
    const res = await listTasksHandler(makeReqCtx({ query: { limit: "500" } }));

    expect(res.statusCode).toBe(400);
  });
});

describe("getTaskHandler", () => {
  it("reads the id from route params and coerces it to a number", async () => {
    dal.getTaskById.mockResolvedValue(makeTask({ id: 7 }));

    const res = await getTaskHandler(makeReqCtx({ params: { id: "7" } }));

    expect(res.statusCode).toBe(200);
    expect(dal.getTaskById).toHaveBeenCalledWith({}, 7);
  });

  it("uses route params, not the event's pathParameters", async () => {
    dal.getTaskById.mockResolvedValue(makeTask({ id: 7 }));

    const res = await getTaskHandler(
      makeReqCtx({ params: { id: "7" }, pathParameters: { proxy: "7" } }),
    );

    expect(res.statusCode).toBe(200);
    expect(dal.getTaskById).toHaveBeenCalledWith({}, 7);
  });

  it("returns 404 when the task does not exist", async () => {
    dal.getTaskById.mockResolvedValue(undefined);

    const res = await getTaskHandler(makeReqCtx({ params: { id: "99" } }));

    expect(res.statusCode).toBe(404);
    expect(bodyOf(res).error).toBe("Task 99 not found");
  });

  it("rejects a non-numeric id with 400", async () => {
    const res = await getTaskHandler(makeReqCtx({ params: { id: "abc" } }));

    expect(res.statusCode).toBe(400);
    expect(dal.getTaskById).not.toHaveBeenCalled();
  });

  it("rejects a negative id with 400", async () => {
    const res = await getTaskHandler(makeReqCtx({ params: { id: "-1" } }));

    expect(res.statusCode).toBe(400);
  });
});

describe("updateTaskHandler", () => {
  it("updates and returns 200 with the updated row", async () => {
    dal.updateTask.mockResolvedValue(makeTask({ id: 5, title: "Updated" }));

    const res = await updateTaskHandler(
      makeReqCtx({
        params: { id: "5" },
        body: JSON.stringify({ title: "Updated" }),
      }),
    );

    expect(res.statusCode).toBe(200);
    expect(dal.updateTask).toHaveBeenCalledWith({}, 5, { title: "Updated" });
    expect(bodyOf(res)).toMatchObject({ title: "Updated" });
  });

  it("does not inject defaults for fields the caller omitted", async () => {
    dal.updateTask.mockResolvedValue(makeTask({ id: 5 }));

    await updateTaskHandler(
      makeReqCtx({
        params: { id: "5" },
        body: JSON.stringify({ title: "Only the title" }),
      }),
    );

    const [, , patch] = dal.updateTask.mock.calls[0];
    expect(Object.keys(patch)).toEqual(["title"]);
    expect(patch).not.toHaveProperty("status");
    expect(patch).not.toHaveProperty("priority");
  });

  it("still accepts an explicit status/priority in the patch", async () => {
    dal.updateTask.mockResolvedValue(makeTask({ id: 5 }));

    await updateTaskHandler(
      makeReqCtx({
        params: { id: "5" },
        body: JSON.stringify({ status: "review", priority: 1 }),
      }),
    );

    expect(dal.updateTask).toHaveBeenCalledWith({}, 5, {
      status: "review",
      priority: 1,
    });
  });

  it("rejects an empty patch with 400", async () => {
    const res = await updateTaskHandler(
      makeReqCtx({ params: { id: "5" }, body: "{}" }),
    );

    expect(res.statusCode).toBe(400);
    expect(dal.updateTask).not.toHaveBeenCalled();
  });

  it("returns 404 when the task does not exist", async () => {
    dal.updateTask.mockResolvedValue(undefined);

    const res = await updateTaskHandler(
      makeReqCtx({ params: { id: "5" }, body: JSON.stringify({ title: "x" }) }),
    );

    expect(res.statusCode).toBe(404);
  });
});

describe("deleteTaskHandler", () => {
  it("returns 204 with no body", async () => {
    dal.deleteTask.mockResolvedValue(true);

    const res = await deleteTaskHandler(makeReqCtx({ params: { id: "5" } }));

    expect(res.statusCode).toBe(204);
    expect(res.body).toBeUndefined();
    expect(dal.deleteTask).toHaveBeenCalledWith({}, 5);
  });

  it("returns 404 when nothing was deleted", async () => {
    dal.deleteTask.mockResolvedValue(false);

    const res = await deleteTaskHandler(makeReqCtx({ params: { id: "5" } }));

    expect(res.statusCode).toBe(404);
    expect(bodyOf(res).error).toBe("Task 5 not found");
  });
});
