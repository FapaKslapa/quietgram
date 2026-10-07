import { z } from "zod";

export const userIdSchema = z.string().regex(/^\d{1,32}$/);

export const mediaIdSchema = z.string().regex(/^\d{1,32}(_\d{1,32})?$/);

export const commentIdSchema = z.string().regex(/^\d{1,32}$/);
