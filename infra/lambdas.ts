import { LAMBDA_RUNTIME } from "../constants/infrastructure.constants.js";

export function createLambdaDefinitions() {
  return {
    health: {
      name: `${$app.name}-${$app.stage}-health`,
      handler: "lambdas/healthCheckLambda.handler",
      runtime: LAMBDA_RUNTIME,
    },
    secured: {
      name: `${$app.name}-${$app.stage}-api`,
      handler: "lambdas/securedLambda.handler",
      runtime: LAMBDA_RUNTIME,
    },
  } as const;
}
