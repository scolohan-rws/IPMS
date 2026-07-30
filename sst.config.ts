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
      name: `${$app.name}-${$app.stage}-health`,
      handler: "lambdas/healthCheckLambda.handler",
      runtime: "nodejs24.x",
    });

    const authStage = $app.stage;
    const authFnArn = aws.ssm.getParameterOutput({
      name: `/ipms-auth/${authStage}/authorizer/arn`,
    }).value;
    const authFnInvokeArn = aws.ssm.getParameterOutput({
      name: `/ipms-auth/${authStage}/authorizer/invoke-arn`,
    }).value;

    const authorizer = new aws.apigatewayv2.Authorizer(
      "SharedTokenAuthorizer",
      {
        apiId: api.nodes.api.id,
        name: "tokenAuthorizer",
        authorizerType: "REQUEST",
        authorizerUri: authFnInvokeArn,
        authorizerPayloadFormatVersion: "2.0",
        enableSimpleResponses: true,
        authorizerResultTtlInSeconds: 300,
        identitySources: ["$request.header.Authorization"],
      },
    );

    new aws.lambda.Permission("AllowAuthorizerInvoke", {
      action: "lambda:InvokeFunction",
      function: authFnArn,
      principal: "apigateway.amazonaws.com",
      sourceArn: $interpolate`${api.nodes.api.executionArn}/authorizers/${authorizer.id}`,
    });

    api.route(
      "GET /secured",
      {
        name: `${$app.name}-${$app.stage}-api`,
        handler: "lambdas/securedLambda.handler",
        runtime: "nodejs24.x",
      },
      { auth: { lambda: authorizer.id } },
    );

    return {
      healthUrl: $interpolate`${api.url}/health`,
      securedUrl: $interpolate`${api.url}/secured`,
    };
  },
});
