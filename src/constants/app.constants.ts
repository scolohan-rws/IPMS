// Application
export const APP_NAME = "ipms";
export const DEVELOPMENT_STAGE = "dev";
export const PRODUCTION_STAGE = "prod";

// Authentication
export const DEV_TOKEN_TTL_SECONDS = 86_400; // 24 hours
export const PROD_TOKEN_TTL_SECONDS = 3_600; // 1 hour
export const DEFAULT_TOKEN_TTL_SECONDS = 28_800; // 8 hours

// AWS
export const DEFAULT_AWS_REGION = "eu-west-2";
export const LAMBDA_RUNTIME = "nodejs24.x";
export const LAMBDA_INVOKE_ACTION = "lambda:InvokeFunction";
export const API_GATEWAY_PRINCIPAL = "apigateway.amazonaws.com";
export const AUTHORIZER_INVOKE_PERMISSION_NAME = "AllowOwnApiInvokeAuthorizer";

// Logging
export const DEFAULT_LOG_LEVEL = "INFO";

// VPC
export const VPC_ANYONE_CIDR = "0.0.0.0/0";

// DB
export const POSTGRES_PORT = 5432;
