import type {
  APIGatewayProxyEventV2WithLambdaAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

export type AuthContext = {
  principalId: string;
};

export type AuthedEvent =
  APIGatewayProxyEventV2WithLambdaAuthorizer<AuthContext>;

export const securedHandler = async (
  event: AuthedEvent,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const auth = event.requestContext.authorizer.lambda;

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: "Access granted!",
      principalId: auth.principalId,
    }),
  };
};

export const handler = securedHandler;
