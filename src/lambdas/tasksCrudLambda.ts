import type { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { db } from "../db/index.js";
import { createTasksRouter } from "../handlers/tasks.js";
import { logger } from "../lib/logger.js";
import { createTaskService } from "../services/tasks.js";

const app = createTasksRouter(createTaskService(db));

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
