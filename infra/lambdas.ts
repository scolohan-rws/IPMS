import { LAMBDA_PATH, LAMBDA_RUNTIME } from "../src/constants/app.constants";
import { withDbAccess } from "./with-db-access.js";

export async function createLambdaDefinitions() {
  return {
    health: {
      name: `${$app.name}-${$app.stage}-health`,
      handler: `${LAMBDA_PATH}healthCheckLambda.handler`,
      runtime: LAMBDA_RUNTIME,
    },
    secured: {
      name: `${$app.name}-${$app.stage}-api`,
      handler: `${LAMBDA_PATH}securedLambda.handler`,
      runtime: LAMBDA_RUNTIME,
    },
    tasks: await withDbAccess({
      name: `${$app.name}-${$app.stage}-manage-tasks`,
      handler: `${LAMBDA_PATH}tasksCrudLambda.handler`,
      runtime: LAMBDA_RUNTIME,
    }),
  } as const;
}
