import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeContext, makeTask, makeV2Event } from "../helpers/fixtures.js";

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
import { handler } from "../../src/lambdas/tasksCrudLambda.js";

const dal = vi.mocked(taskDal);

const invoke = (opts: Parameters<typeof makeV2Event>[0]) =>
  handler(makeV2Event(opts), makeContext());

beforeEach(() => {
  vi.resetAllMocks();
});

describe("routing", () => {
  it("routes GET /tasks/all to the list handler", async () => {
    dal.listTasks.mockResolvedValue([makeTask()]);

    const res = await invoke({ method: "GET", path: "/tasks/all" });

    expect(res.statusCode).toBe(200);
    expect(dal.listTasks).toHaveBeenCalled();
    expect(dal.getTaskById).not.toHaveBeenCalled();
  });

  it("routes GET /tasks/5 to the get handler with the captured id", async () => {
    dal.getTaskById.mockResolvedValue(makeTask({ id: 5 }));

    const res = await invoke({ method: "GET", path: "/tasks/5" });

    expect(res.statusCode).toBe(200);
    expect(dal.getTaskById).toHaveBeenCalledWith({}, 5);
    expect(JSON.parse(res.body ?? "null")).toMatchObject({ id: 5 });
  });

  it("routes POST /tasks/create to the create handler", async () => {
    dal.createTask.mockResolvedValue(makeTask({ id: 9 }));

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
});

describe("query string handling through the router", () => {
  it("passes the parsed query string to the DAL", async () => {
    dal.listTasks.mockResolvedValue([]);

    const res = await invoke({
      method: "GET",
      path: "/tasks/all",
      rawQueryString: "status=done&limit=5",
      query: { status: "done", limit: "5" },
    });

    expect(res.statusCode).toBe(200);
    expect(dal.listTasks).toHaveBeenCalledWith(
      {},
      { status: "done", limit: 5, offset: 0 },
    );
  });
});

describe("DELETE /tasks/:id", () => {
  it("returns a real 204 with an empty body", async () => {
    dal.deleteTask.mockResolvedValue(true);

    const res = await invoke({ method: "DELETE", path: "/tasks/5" });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBeFalsy();
    expect(dal.deleteTask).toHaveBeenCalledWith({}, 5);
  });
});

describe("error handling", () => {
  it("converts a DAL failure into a 500 rather than throwing out of the lambda", async () => {
    dal.getTaskById.mockRejectedValue(new Error("connection terminated"));

    const res = await invoke({ method: "GET", path: "/tasks/5" });

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body ?? "null")).toEqual({
      error: "Internal server error",
    });
  });

  it("returns 400 for a body that fails validation", async () => {
    const res = await invoke({
      method: "POST",
      path: "/tasks/create",
      body: JSON.stringify({ title: "" }),
    });

    expect(res.statusCode).toBe(400);
    expect(dal.createTask).not.toHaveBeenCalled();
  });
});
