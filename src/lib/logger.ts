import { Logger } from "@aws-lambda-powertools/logger";
import { APP_NAME } from "../constants/app.constants.js";

export const logger = new Logger({ serviceName: APP_NAME });

/**
 * Binds attributes to every line a handler logs, so one invocation's output can
 * be correlated by `requestId`.
 */
export const createLogger = (persistentKeys: Record<string, unknown>) =>
  logger.createChild({ persistentKeys });
