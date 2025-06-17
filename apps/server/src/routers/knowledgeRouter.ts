import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { knowledgeEntries } from "../db/schema/knowledge";
import { protectedProcedure, router } from "../lib/trpc";

export const knowledgeRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await db
      .select()
      .from(knowledgeEntries)
      .where(eq(knowledgeEntries.userId, ctx.session.user.id));
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await db.insert(knowledgeEntries).values({
        userId: ctx.session.user.id,
        title: input.title,
        content: input.content,
      });
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      // Simple case-insensitive search
      const entries = await db
        .select()
        .from(knowledgeEntries)
        .where(eq(knowledgeEntries.userId, ctx.session.user.id));

      return entries.filter(
        (entry) =>
          entry.title.toLowerCase().includes(input.query.toLowerCase()) ||
          entry.content.toLowerCase().includes(input.query.toLowerCase())
      );
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await db
        .delete(knowledgeEntries)
        .where(
          eq(knowledgeEntries.id, input.id) &&
            eq(knowledgeEntries.userId, ctx.session.user.id)
        );
    }),
}); 