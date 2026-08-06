import * as taskDal from "../data/tasks.js";
import type { Executor } from "../data/types.js";
import type { Task } from "../db/schema/index.js";
import { NotFoundError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import type {
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
} from "../lib/schemas.js";

export interface TaskService {
  create(input: CreateTaskInput): Promise<Task>;
  list(query: ListTasksQuery): Promise<Task[]>;
  get(id: number): Promise<Task>;
  update(id: number, patch: UpdateTaskInput): Promise<Task>;
  remove(id: number): Promise<void>;
}

export function createTaskService(executor: Executor): TaskService {
  return {
    async create(input) {
      const task = await taskDal.createTask(executor, input);
      logger.info("Task created", { taskId: task.id, status: task.status });
      return task;
    },

    async list(query) {
      const items = await taskDal.listTasks(executor, query);
      logger.info("Tasks listed", {
        count: items.length,
        status: query.status,
        limit: query.limit,
        offset: query.offset,
      });
      return items;
    },

    async get(id) {
      const task = await taskDal.getTaskById(executor, id);
      if (!task) throw new NotFoundError(`Task ${id} not found`);
      return task;
    },

    async update(id, patch) {
      const task = await taskDal.updateTask(executor, id, patch);
      if (!task) throw new NotFoundError(`Task ${id} not found`);

      logger.info("Task updated", { taskId: id, fields: Object.keys(patch) });
      return task;
    },

    async remove(id) {
      const deleted = await taskDal.deleteTask(executor, id);
      if (!deleted) throw new NotFoundError(`Task ${id} not found`);

      logger.info("Task deleted", { taskId: id });
    },
  };
}
