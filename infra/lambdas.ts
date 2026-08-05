import { withDbAccess } from "../../auth/infra/with-db-access.js";
import { LAMBDA_RUNTIME } from "../constants/infrastructure.constants.js";

export async function createLambdaDefinitions() {
  return {
    health: {
      name: `${$app.name}-${$app.stage}-health`,
      handler: "src/lambdas/healthCheckLambda.handler",
      runtime: LAMBDA_RUNTIME,
    },
    secured: {
      name: `${$app.name}-${$app.stage}-api`,
      handler: "src/lambdas/securedLambda.handler",
      runtime: LAMBDA_RUNTIME,
    },
    tasks: await withDbAccess({
      name: `${$app.name}-${$app.stage}-api-tasks`,
      handler: "src/lambdas/tasksCrudLambda.handler",
      runtime: LAMBDA_RUNTIME,
    }),
  } as const;
}
