import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { brandKits, customTemplates, docVersions } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

const brandSchema = z.object({
  logoUrl: z.string().max(2000).optional().default(""),
  primaryColor: z.string().max(16).optional().default("#6d28d9"),
  headingColor: z.string().max(16).optional().default("#1e1b4b"),
  font: z.string().max(64).optional().default("Calibri"),
  watermark: z.string().max(128).optional().default(""),
  signatureName: z.string().max(128).optional().default(""),
  signatureTitle: z.string().max(128).optional().default(""),
});

export const workspaceRouter = router({
  getBrand: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(brandKits).where(eq(brandKits.userId, ctx.user.id)).limit(1);
    return rows[0] || null;
  }),
  saveBrand: protectedProcedure.input(brandSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const rows = await db.select().from(brandKits).where(eq(brandKits.userId, ctx.user.id)).limit(1);
    if (rows.length) {
      await db.update(brandKits).set({ ...input, userId: ctx.user.id }).where(eq(brandKits.userId, ctx.user.id));
    } else {
      await db.insert(brandKits).values({ ...input, userId: ctx.user.id });
    }
    return { success: true };
  }),
  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(customTemplates).where(eq(customTemplates.userId, ctx.user.id)).orderBy(desc(customTemplates.createdAt)).limit(50);
  }),
  saveTemplate: protectedProcedure.input(z.object({
    name: z.string().min(1).max(128),
    optionsJson: z.string().min(2).max(20000),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(customTemplates).values({ userId: ctx.user.id, name: input.name, optionsJson: input.optionsJson });
    return { success: true };
  }),
  deleteTemplate: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(customTemplates).where(and(eq(customTemplates.id, input.id), eq(customTemplates.userId, ctx.user.id)));
    return { success: true };
  }),
  saveVersion: protectedProcedure.input(z.object({
    docKey: z.string().min(1).max(128).optional().default("main"),
    text: z.string().min(1).max(200000),
    label: z.string().max(128).optional().default(""),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(docVersions).values({ userId: ctx.user.id, docKey: input.docKey, text: input.text, label: input.label });
    const rows = await db.select().from(docVersions).where(and(eq(docVersions.userId, ctx.user.id), eq(docVersions.docKey, input.docKey))).orderBy(desc(docVersions.createdAt)).limit(100);
    if (rows.length > 20) {
      const { lt } = await import("drizzle-orm");
      await db.delete(docVersions).where(and(eq(docVersions.userId, ctx.user.id), eq(docVersions.docKey, input.docKey), lt(docVersions.id, rows[20].id)));
    }
    return { success: true };
  }),
  listVersions: protectedProcedure.input(z.object({
    docKey: z.string().min(1).max(128).optional().default("main"),
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(docVersions).where(and(eq(docVersions.userId, ctx.user.id), eq(docVersions.docKey, input.docKey))).orderBy(desc(docVersions.createdAt)).limit(20);
    return rows.map((r) => ({ id: r.id, label: r.label, preview: r.text.slice(0, 160), createdAt: r.createdAt.getTime(), full: r.text }));
  }),
});
