import { z } from "zod";
import { listMessages, listThreads, sendMessage, syncInbox, syncThread } from "@/lib/sync/messages";
import { guarded } from "@/server/trpc/errors";
import { createTRPCRouter, protectedProcedure, syncDepsOf } from "@/server/trpc/init";

const threadIdSchema = z.string().regex(/^[\w-]{1,64}$/);

const threadInput = z.compile(z.object({ threadId: threadIdSchema }));

const sendInput = z.compile(z.object({ threadId: threadIdSchema, text: z.string() }));

const messageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  text: z.string().nullable(),
  sentAt: z.number(),
});

const threadsOutput = z.compile(
  z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      lastActivityAt: z.number(),
      unread: z.boolean(),
      preview: z.string().nullable(),
    }),
  ),
);

const messagesOutput = z.compile(z.array(messageSchema));
const sentOutput = z.compile(messageSchema);

export const messagesRouter = createTRPCRouter({
  threads: protectedProcedure
    .output(threadsOutput)
    .query(({ ctx }) => listThreads(ctx.db, ctx.session.user.id)),

  syncInbox: protectedProcedure.mutation(({ ctx }) =>
    guarded(() => syncInbox(syncDepsOf(ctx), ctx.session.user.id)),
  ),

  thread: protectedProcedure
    .input(threadInput)
    .output(messagesOutput)
    .mutation(({ ctx, input }) =>
      guarded(async () => {
        await syncThread(syncDepsOf(ctx), ctx.session.user.id, input.threadId);
        return listMessages(ctx.db, ctx.session.user.id, input.threadId);
      }),
    ),

  send: protectedProcedure
    .input(sendInput)
    .output(sentOutput)
    .mutation(({ ctx, input }) =>
      guarded(() => sendMessage(syncDepsOf(ctx), ctx.session.user.id, input)),
    ),
});
