import { Router } from "@aws-lambda-powertools/event-handler/http";
import type { APIGatewayProxyEventV2, Context } from "aws-lambda";
import * as tasks from "../handlers/tasks.js";
import { logger } from "../lib/logger.js";

const app = new Router();

app.post("/tasks/create", tasks.createTaskHandler);
app.get("/tasks/all", tasks.listTasksHandler);
app.get("/tasks/:id", tasks.getTaskHandler);
app.patch("/tasks/:id", tasks.updateTaskHandler);
app.delete("/tasks/:id", tasks.deleteTaskHandler);

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context,
) => {
  logger.addContext(context);

  logger.appendKeys({
    requestId: event.requestContext.requestId,
    route: event.routeKey,
  });

  logger.info("Request received", {
    method: event.requestContext.http.method,
    path: event.rawPath,
  });

  try {
    return await app.resolve(event, context);
  } catch (error) {
    logger.error("Unhandled error resolving request", { error });
    throw error;
  } finally {
    logger.resetKeys();
  }
};
