/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  async app(input) {
    const { APP_NAME, DEFAULT_AWS_REGION, PRODUCTION_STAGE } = await import(
      "./src/constants/app.constants"
    );
    const isProduction = input.stage === PRODUCTION_STAGE;

    return {
      name: APP_NAME,
      removal: isProduction ? "retain" : "remove",
      protect: isProduction,
      home: "aws",
      providers: {
        aws: {
          region: process.env.AWS_REGION || DEFAULT_AWS_REGION,
        },
      },
    };
  },
  async run() {
    const [
      { createApiGateway, createTokenAuthorizer },
      { registerEndpoints },
      { createLambdaDefinitions },
    ] = await Promise.all([
      import("./infra/api-gateway.js"),
      import("./infra/endpoints.js"),
      import("./infra/lambdas.js"),
    ]);

    const api = await createApiGateway();
    const authorizer = await createTokenAuthorizer(api);
    const lambdas = await createLambdaDefinitions();

    return registerEndpoints({ api, authorizer, lambdas });
  },
});
