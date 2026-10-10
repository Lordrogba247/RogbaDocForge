import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { conversionRouter } from "./routers/conversion";
import { aiRouter } from "./routers/ai";
import { workspaceRouter } from "./routers/workspace";
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({
      ctx
    }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, {
        ...cookieOptions,
        maxAge: -1
      });
      return {
        success: true
      };
    })
  }),
  conversion: conversionRouter,
  ai: aiRouter,
  workspace: workspaceRouter
});