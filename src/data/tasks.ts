import { eq, and, desc, sql } from "drizzle-orm";
import { tasks, type Task, type NewTask } from "../db/schema/index.js";
import type { Executor, TaskStatus } from "./types.js";

export async function createTask(
  executor: Executor,
  data: Omit<NewTask, "id" | "createdAt" | "updatedAt">,
): Promise<Task> {
  const [task] = await executor.insert(tasks).values(data).returning();
  return task;
}

export async function getTaskById(
  executor: Executor,
  id: number,
): Promise<Task | undefined> {
  const [task] = await executor
    .select()
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);
  return task;
}

export async function listTasks(
  executor: Executor,
  opts?: {
    status?: TaskStatus;
    limit?: number;
    offset?: number;
  },
): Promise<Task[]> {
  const conditions = [];
  if (opts?.status) conditions.push(eq(tasks.status, opts.status));

  const query = executor
    .select()
    .from(tasks)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(tasks.createdAt));

  if (opts?.limit) query.limit(opts.limit);
  if (opts?.offset) query.offset(opts.offset);

  return query;
}

export async function countTasksByStatus(
  executor: Executor,
): Promise<Record<TaskStatus, number>> {
  const rows = await executor
    .select({
      status: tasks.status,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .groupBy(tasks.status);

  const result = { todo: 0, in_progress: 0, review: 0, done: 0 } as Record<
    TaskStatus,
    number
  >;
  for (const row of rows) result[row.status] = row.count;
  return result;
}

export async function updateTask(
  executor: Executor,
  id: number,
  data: Partial<Omit<NewTask, "id" | "createdAt">>,
): Promise<Task | undefined> {
  const [task] = await executor
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  return task;
}

export async function updateTaskStatus(
  executor: Executor,
  id: number,
  status: TaskStatus,
): Promise<Task | undefined> {
  return updateTask(executor, id, { status });
}

export async function deleteTask(
  executor: Executor,
  id: number,
): Promise<boolean> {
  const result = await executor.delete(tasks).where(eq(tasks.id, id));
  return (result as unknown as { rowCount: number }).rowCount > 0;
}
