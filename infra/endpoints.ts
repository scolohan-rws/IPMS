import type { createApiGateway, createTokenAuthorizer } from "./api-gateway.js";
import type { createLambdaDefinitions } from "./lambdas.js";

interface RegisterEndpointsArgs {
  api: Awaited<ReturnType<typeof createApiGateway>>;
  authorizer: Awaited<ReturnType<typeof createTokenAuthorizer>>;
  lambdas: Awaited<ReturnType<typeof createLambdaDefinitions>>;
}

export function registerEndpoints({
  api,
  authorizer,
  lambdas,
}: RegisterEndpointsArgs) {
  // As the API grows, move related routes into domain-specific modules
  // (for example, routes/users.ts) and register those modules from here.
  api.route("GET /health", lambdas.health);

  api.route("GET /secured", lambdas.secured, {
    auth: { lambda: authorizer.id },
  });

  api.route("ANY /tasks/{proxy+}", lambdas.tasks, {
    auth: { lambda: authorizer.id },
  });

  return {
    apiUrl: api.url,
  };
}
