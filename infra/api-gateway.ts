import {
  API_GATEWAY_PRINCIPAL,
  AUTHORIZER_INVOKE_PERMISSION_NAME,
  LAMBDA_INVOKE_ACTION,
} from "../src/constants/app.constants";

export function createApiGateway() {
  return new sst.aws.ApiGatewayV2("ipms-api", {
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
}

export function createTokenAuthorizer(
  api: ReturnType<typeof createApiGateway>,
) {
  const authStage = $app.stage;
  const authFnArn = aws.ssm.getParameterOutput({
    name: `/ipms-auth/${authStage}/authorizer/arn`,
  }).value;
  const authFnInvokeArn = aws.ssm.getParameterOutput({
    name: `/ipms-auth/${authStage}/authorizer/invoke-arn`,
  }).value;

  const authorizer = new aws.apigatewayv2.Authorizer("SharedTokenAuthorizer", {
    apiId: api.nodes.api.id,
    name: "tokenAuthorizer",
    authorizerType: "REQUEST",
    authorizerUri: authFnInvokeArn,
    authorizerPayloadFormatVersion: "2.0",
    enableSimpleResponses: true,
    authorizerResultTtlInSeconds: 300,
    identitySources: ["$request.header.Authorization"],
  });

  new aws.lambda.Permission(AUTHORIZER_INVOKE_PERMISSION_NAME, {
    action: LAMBDA_INVOKE_ACTION,
    function: authFnArn,
    principal: API_GATEWAY_PRINCIPAL,
    sourceArn: $interpolate`${api.nodes.api.executionArn}/authorizers/${authorizer.id}`,
  });

  return authorizer;
}
