import type { db } from "../db/index.js";
import type { taskStatusEnum } from "../db/schema/index.js";

export type Executor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];
