import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeExecutor, makeTask } from "../helpers/fixtures.js";

vi.mock("../../src/data/tasks.js", () => ({
  createTask: vi.fn(),
  getTaskById: vi.fn(),
  listTasks: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

import * as taskDal from "../../src/data/tasks.js";
import { NotFoundError } from "../../src/lib/errors.js";
import { createTaskService } from "../../src/services/tasks.js";

const dal = vi.mocked(taskDal);
const service = createTaskService(fakeExecutor);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("create", () => {
  it("forwards the executor and input to the data layer", async () => {
    const task = makeTask({ id: 3 });
    dal.createTask.mockResolvedValue(task);

    const result = await service.create({
      title: "New",
      status: "todo",
      priority: 3,
    });

    expect(result).toBe(task);
    expect(dal.createTask).toHaveBeenCalledWith(fakeExecutor, {
      title: "New",
      status: "todo",
      priority: 3,
    });
  });
});

describe("list", () => {
  it("returns the rows the data layer produced", async () => {
    const rows = [makeTask({ id: 1 }), makeTask({ id: 2 })];
    dal.listTasks.mockResolvedValue(rows);

    const result = await service.list({ limit: 20, offset: 0 });

    expect(result).toBe(rows);
    expect(dal.listTasks).toHaveBeenCalledWith(fakeExecutor, {
      limit: 20,
      offset: 0,
    });
  });
});

describe("get", () => {
  it("returns the task when it exists", async () => {
    const task = makeTask({ id: 7 });
    dal.getTaskById.mockResolvedValue(task);

    await expect(service.get(7)).resolves.toBe(task);
    expect(dal.getTaskById).toHaveBeenCalledWith(fakeExecutor, 7);
  });

  it("throws NotFoundError when the row is missing", async () => {
    dal.getTaskById.mockResolvedValue(undefined);

    await expect(service.get(99)).rejects.toThrow(NotFoundError);
    await expect(service.get(99)).rejects.toThrow("Task 99 not found");
  });
});

describe("update", () => {
  it("returns the updated row", async () => {
    const task = makeTask({ id: 5, title: "Updated" });
    dal.updateTask.mockResolvedValue(task);

    await expect(service.update(5, { title: "Updated" })).resolves.toBe(task);
    expect(dal.updateTask).toHaveBeenCalledWith(fakeExecutor, 5, {
      title: "Updated",
    });
  });

  it("throws NotFoundError when the row is missing", async () => {
    dal.updateTask.mockResolvedValue(undefined);

    await expect(service.update(5, { title: "x" })).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe("remove", () => {
  it("resolves when a row was deleted", async () => {
    dal.deleteTask.mockResolvedValue(true);

    await expect(service.remove(5)).resolves.toBeUndefined();
    expect(dal.deleteTask).toHaveBeenCalledWith(fakeExecutor, 5);
  });

  it("throws NotFoundError when nothing was deleted", async () => {
    dal.deleteTask.mockResolvedValue(false);

    await expect(service.remove(5)).rejects.toThrow("Task 5 not found");
  });
});

describe("error propagation", () => {
  it("lets data layer failures bubble up untouched", async () => {
    dal.getTaskById.mockRejectedValue(new Error("connection terminated"));

    await expect(service.get(1)).rejects.toThrow("connection terminated");
  });
});
