/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    const isProduction = input.stage === "prod";

    return {
      name: "ipms",
      removal: isProduction ? "retain" : "remove",
      protect: isProduction,
      home: "aws",
      providers: {
        aws: {
          region: process.env.AWS_REGION || "eu-west-2",
        },
      },
    };
  },
  async run() {
    const api = new sst.aws.ApiGatewayV2("ipms-api", {
      transform: {
        api: {
          name: `${$app.name}-${$app.stage}-api`,
          tags: {
            Application: $app.name,
            Environment: $app.stage,
            ManagedBy: "SST",
          },
        },
      },
    });

    api.route("GET /health", {
      handler: "lambda/index.handler",
      runtime: "nodejs24.x",
    });

    return {
      healthUrl: $interpolate`${api.url}/health`,
    };
  },
});
