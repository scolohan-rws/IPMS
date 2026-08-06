import { z } from "zod";
import { taskStatusEnum } from "../db/schema/index.js";

export const taskStatusSchema = z.enum(taskStatusEnum.enumValues);

export const taskIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const taskFields = {
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(10_000).nullish(),
  status: taskStatusSchema,
  priority: z.coerce.number().int().min(1).max(5),
  dueAt: z.coerce.date().nullish(),
};

export const createTaskSchema = z.object({
  ...taskFields,
  status: taskFields.status.default("todo"),
  priority: taskFields.priority.default(3),
});

// Every field optional, but reject an empty object outright
export const updateTaskSchema = z
  .object(taskFields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
