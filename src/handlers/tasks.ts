import {
  HttpError,
  json,
  parseBody,
  parseParams,
  withErrors,
} from "../lib/http.js";
import type { RequestContext } from "@aws-lambda-powertools/event-handler/types";
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  updateTaskSchema,
} from "../lib/schemas.js";
import * as taskDal from "../data/tasks.js";
import { db } from "../db/index.js";
import { logger } from "../lib/logger.js";

export const createTaskHandler = withErrors(
  async ({ event }: RequestContext) => {
    const input = parseBody(createTaskSchema, event.body);
    const task = await taskDal.createTask(db, input);
    logger.info("Task created", { taskId: task.id, status: task.status });
    return json(201, task);
  },
);

export const listTasksHandler = withErrors(
  async ({ event }: RequestContext) => {
    const query = parseParams(
      listTasksQuerySchema,
      event.queryStringParameters,
    );

    const items = await taskDal.listTasks(db, query);
    logger.info("Tasks listed", {
      count: items.length,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });

    return json(200, { items, limit: query.limit, offset: query.offset });
  },
);

export const getTaskHandler = withErrors(async ({ params }: RequestContext) => {
  const { id } = parseParams(taskIdParamSchema, params);

  const task = await taskDal.getTaskById(db, id);
  if (!task) {
    logger.warn("Task not found", { taskId: id });
    throw new HttpError(404, `Task ${id} not found`);
  }

  return json(200, task);
});

export const updateTaskHandler = withErrors(
  async ({ event, params }: RequestContext) => {
    const { id } = parseParams(taskIdParamSchema, params);

    const input = parseBody(updateTaskSchema, event.body);
    const task = await taskDal.updateTask(db, id, input);
    if (!task) {
      logger.warn("Task not found for update", { taskId: id });
      throw new HttpError(404, `Task ${id} not found`);
    }

    logger.info("Task updated", { taskId: id, fields: Object.keys(input) });
    return json(200, task);
  },
);

export const deleteTaskHandler = withErrors(
  async ({ params }: RequestContext) => {
    const { id } = parseParams(taskIdParamSchema, params);

    const deleted = await taskDal.deleteTask(db, id);
    if (!deleted) {
      logger.warn("Task not found for delete", { taskId: id });
      throw new HttpError(404, `Task ${id} not found`);
    }

    logger.info("Task deleted", { taskId: id });
    return json(204, null);
  },
);
