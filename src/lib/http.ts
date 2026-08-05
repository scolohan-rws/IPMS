import z from "zod";
import { logger } from "./logger.js";

type HandlerResult = {
  statusCode: number;
  headers: Record<string, string>;
  body?: string;
};

export const json = (statusCode: number, payload: unknown): HandlerResult => ({
  statusCode,
  headers: { "content-type": "application/json" },
  ...(payload === null ? {} : { body: JSON.stringify(payload) }),
});

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  raw: string | null | undefined,
) {
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    throw new HttpError(400, "Request body is not valid JSON");
  }
  const result = schema.safeParse(parsed);

  if (!result.success) {
    throw new HttpError(400, "Validation failed", z.treeifyError(result.error));
  }

  return result.data as z.infer<T>;
}

export function parseParams<T extends z.ZodTypeAny>(
  schema: T,
  raw: Record<string, string | undefined> | null | undefined,
) {
  const result = schema.safeParse(raw ?? {});

  if (!result.success) {
    throw new HttpError(400, "Validation failed", z.treeifyError(result.error));
  }

  return result.data as z.infer<T>;
}

export function withErrors<E>(
  fn: (event: E) => Promise<HandlerResult>,
): (event: E) => Promise<HandlerResult> {
  return async (event) => {
    try {
      return await fn(event);
    } catch (err) {
      if (err instanceof HttpError) {
        logger.warn("Request rejected", {
          statusCode: err.statusCode,
          message: err.message,
          details: err.details,
        });

        return json(err.statusCode, {
          error: err.message,
          ...(err.details ? { details: err.details } : {}),
        });
      }

      logger.error("Unhandled error in task handler", { error: err });
      return json(500, { error: "Internal server error" });
    }
  };
}
