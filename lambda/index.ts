import type {
  APIGatewayProxyHandlerV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

export const healthCheck =
  async (): Promise<APIGatewayProxyStructuredResultV2> => ({
    statusCode: 200,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ status: "ok" }),
  });

export const handler: APIGatewayProxyHandlerV2 = healthCheck;
