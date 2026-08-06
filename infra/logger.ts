import { APP_NAME, DEFAULT_LOG_LEVEL } from "../src/constants/app.constants.js";

export function loggingEnvironment() {
  return {
    POWERTOOLS_SERVICE_NAME: APP_NAME,
    POWERTOOLS_LOG_LEVEL: process.env.LOG_LEVEL ?? DEFAULT_LOG_LEVEL,
  };
}
