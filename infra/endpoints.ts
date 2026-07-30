import type { createApiGateway, createTokenAuthorizer } from "./api-gateway.js";
import type { createLambdaDefinitions } from "./lambdas.js";

interface RegisterEndpointsArgs {
  api: ReturnType<typeof createApiGateway>;
  authorizer: ReturnType<typeof createTokenAuthorizer>;
  lambdas: ReturnType<typeof createLambdaDefinitions>;
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

  return {
    apiUrl: api.url,
  };
}
