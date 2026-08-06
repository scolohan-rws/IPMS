import type { RequestContext } from "@aws-lambda-powertools/event-handler/types";
import type { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { vi } from "vitest";
import type { Executor } from "../../src/data/types.js";
import type { Task } from "../../src/db/schema/index.js";
import type { TaskService } from "../../src/services/tasks.js";

/**
 * Stand-in for the Drizzle executor. Service specs mock the data layer, so the
 * executor is only ever forwarded, never used.
 */
export const fakeExecutor = {} as unknown as Executor;

/** A `TaskService` whose use cases are all stubs. */
export const makeTaskService = () => ({
  create: vi.fn<TaskService["create"]>(),
  list: vi.fn<TaskService["list"]>(),
  get: vi.fn<TaskService["get"]>(),
  update: vi.fn<TaskService["update"]>(),
  remove: vi.fn<TaskService["remove"]>(),
});

export const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: "Write tests",
  description: "cover the task handlers",
  status: "todo",
  priority: 3,
  dueAt: new Date("2026-09-01T00:00:00.000Z"),
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  ...overrides,
});

/**
 * Builds the argument the Powertools Router actually hands a route handler.
 * Only the fields the task handlers destructure are populated; the cast keeps
 * the fixture from having to stand up a full Request/Response/store triple.
 */
export const makeReqCtx = (opts: {
  body?: string | null;
  query?: Record<string, string | undefined> | null;
  params?: Record<string, string>;
  /**
   * Deliberately separate from `params`: API Gateway fronts this lambda with
   * `ANY /tasks/{proxy+}`, so the event carries `{ proxy }` and never `{ id }`.
   */
  pathParameters?: Record<string, string>;
}): RequestContext =>
  ({
    event: {
      body: opts.body ?? undefined,
      queryStringParameters: opts.query ?? undefined,
      pathParameters: opts.pathParameters,
    },
    params: opts.params ?? {},
  }) as unknown as RequestContext;

export const makeV2Event = (opts: {
  method: string;
  path: string;
  body?: string;
  rawQueryString?: string;
  query?: Record<string, string>;
}): APIGatewayProxyEventV2 =>
  ({
    version: "2.0",
    routeKey: "ANY /tasks/{proxy+}",
    rawPath: opts.path,
    rawQueryString: opts.rawQueryString ?? "",
    headers: { host: "api.example.com", "content-type": "application/json" },
    queryStringParameters: opts.query,
    pathParameters: { proxy: opts.path.replace(/^\/tasks\//, "") },
    isBase64Encoded: false,
    body: opts.body,
    requestContext: {
      accountId: "123456789012",
      apiId: "api123",
      domainName: "api.example.com",
      domainPrefix: "api",
      requestId: "req-abc-123",
      routeKey: "ANY /tasks/{proxy+}",
      stage: "$default",
      time: "05/Aug/2026:00:00:00 +0000",
      timeEpoch: 1_785_000_000_000,
      http: {
        method: opts.method,
        path: opts.path,
        protocol: "HTTP/1.1",
        sourceIp: "203.0.113.1",
        userAgent: "vitest",
      },
    },
  }) as unknown as APIGatewayProxyEventV2;

export const makeContext = (): Context =>
  ({
    callbackWaitsForEmptyEventLoop: false,
    functionName: "tasksCrudLambda",
    functionVersion: "$LATEST",
    invokedFunctionArn:
      "arn:aws:lambda:eu-central-1:123456789012:function:tasksCrudLambda",
    memoryLimitInMB: "512",
    awsRequestId: "req-abc-123",
    logGroupName: "/aws/lambda/tasksCrudLambda",
    logStreamName: "2026/08/05/[$LATEST]abc",
    getRemainingTimeInMillis: () => 30_000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  }) as Context;
