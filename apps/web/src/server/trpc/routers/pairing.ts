import { z } from "zod";
import { issuePairingToken } from "@/lib/auth/pairing";
import { createTRPCRouter, protectedProcedure } from "../init";

const tokenOutput = z.compile(z.object({ token: z.string() }));

export const pairingRouter = createTRPCRouter({
  issueToken: protectedProcedure.output(tokenOutput).mutation(async ({ ctx }) => ({
    token: await issuePairingToken(ctx.db, ctx.session.user.id, new Date()),
  })),
});
