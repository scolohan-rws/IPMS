import { Router } from "@aws-lambda-powertools/event-handler/http";
import type { RequestContext } from "@aws-lambda-powertools/event-handler/types";
import { json, parseBody, parseParams, withErrors } from "../lib/http.js";
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  updateTaskSchema,
} from "../lib/schemas.js";
import type { TaskService } from "../services/tasks.js";

export function createTaskHandlers(tasks: TaskService) {
  return {
    create: withErrors(async ({ event }: RequestContext) => {
      const input = parseBody(createTaskSchema, event.body);
      return json(201, await tasks.create(input));
    }),

    list: withErrors(async ({ event }: RequestContext) => {
      const query = parseParams(
        listTasksQuerySchema,
        event.queryStringParameters,
      );

      const items = await tasks.list(query);
      return json(200, { items, limit: query.limit, offset: query.offset });
    }),

    get: withErrors(async ({ params }: RequestContext) => {
      const { id } = parseParams(taskIdParamSchema, params);
      return json(200, await tasks.get(id));
    }),

    update: withErrors(async ({ event, params }: RequestContext) => {
      const { id } = parseParams(taskIdParamSchema, params);
      const patch = parseBody(updateTaskSchema, event.body);
      return json(200, await tasks.update(id, patch));
    }),

    remove: withErrors(async ({ params }: RequestContext) => {
      const { id } = parseParams(taskIdParamSchema, params);
      await tasks.remove(id);
      return json(204, null);
    }),
  };
}

export function createTasksRouter(tasks: TaskService): Router {
  const handlers = createTaskHandlers(tasks);
  const router = new Router();

  router.post("/tasks/create", handlers.create);
  router.get("/tasks/all", handlers.list);
  router.get("/tasks/:id", handlers.get);
  router.patch("/tasks/:id", handlers.update);
  router.delete("/tasks/:id", handlers.remove);

  return router;
}
