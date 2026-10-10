import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { grammarCheck, rewriteText, autoSummary } from "../../shared/aiTools.js";
import { generateOutline, formatCitation, similarityHint } from "../../shared/aiTools.js";

async function tryLLM(system, user, maxTokens = 800) {
  try {
    const mod = await import("../_core/llm.js");
    if (!mod.invokeLLM) return null;
    const res = await mod.invokeLLM({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      maxTokens,
    });
    const text = res?.choices?.[0]?.message?.content;
    if (typeof text === "string" && text.trim()) return text.trim();
    return null;
  } catch {
    return null;
  }
}

export const aiRouter = router({
  grammar: publicProcedure.input(z.object({
    text: z.string().min(1).max(20000),
    tone: z.enum(["formal", "friendly", "none"]).optional().default("formal"),
  })).mutation(async ({ input }) => {
    const llm = await tryLLM(
      "You are a proofreader. Fix spelling/grammar, apply the requested tone. Return ONLY JSON: {\"fixed\": \"...\", \"issues\": [{\"type\":\"...\",\"original\":\"...\",\"suggestion\":\"...\"}]}",
      `Tone: ${input.tone}\nText:\n${input.text.slice(0, 8000)}`,
      1200
    );
    if (llm) {
      try {
        const start = llm.indexOf("{");
        const parsed = JSON.parse(llm.slice(start));
        if (parsed.fixed) return { fixed: parsed.fixed, issues: parsed.issues || [], source: "ai" };
      } catch { /* fall through */ }
    }
    const r = grammarCheck(input.text, { tone: input.tone === "none" ? "formal" : input.tone });
    return { ...r, source: "offline" };
  }),

  rewrite: publicProcedure.input(z.object({
    text: z.string().min(1).max(20000),
    mode: z.enum(["professional", "shorter", "clearer"]).optional().default("professional"),
  })).mutation(async ({ input }) => {
    const llm = await tryLLM(
      `Rewrite to be more ${input.mode}. Keep meaning, same language. Return ONLY the rewritten text.`,
      input.text.slice(0, 8000), 1200
    );
    if (llm) return { text: llm, source: "ai" };
    return { text: rewriteText(input.text, input.mode), source: "offline" };
  }),

  summarize: publicProcedure.input(z.object({
    text: z.string().min(1).max(30000),
    sentences: z.number().min(1).max(8).optional().default(4),
  })).mutation(async ({ input }) => {
    const llm = await tryLLM(
      `Write a concise executive summary/abstract in ${input.sentences} sentences or fewer. Return ONLY the summary.`,
      input.text.slice(0, 10000), 600
    );
    if (llm) return { text: llm, source: "ai" };
    return { text: autoSummary(input.text, input.sentences), source: "offline" };
  }),

  outline: publicProcedure.input(z.object({
    topic: z.string().min(1).max(300),
    docType: z.string().optional().default("proposal"),
  })).mutation(async ({ input }) => {
    const llm = await tryLLM(
      `Create a draft ${input.docType} outline for the topic. Include section headers and 1-line prompts under each. Return ONLY the outline.`,
      input.topic, 800
    );
    if (llm) return { text: llm, source: "ai" };
    return { text: generateOutline(input.topic, input.docType), source: "offline" };
  }),

  cite: publicProcedure.input(z.object({
    raw: z.string().min(1).max(2000),
    style: z.enum(["apa", "mla", "harvard"]).optional().default("apa"),
  })).mutation(async ({ input }) => {
    const llm = await tryLLM(
      `Format this raw reference into proper ${input.style.toUpperCase()} style. Return ONLY the formatted citation.`,
      input.raw, 300
    );
    if (llm) return { text: llm, source: "ai" };
    return { text: formatCitation(input.raw, input.style), source: "offline" };
  }),

  similarity: publicProcedure.input(z.object({
    text: z.string().min(1).max(30000),
  })).mutation(async ({ input }) => {
    return { ...similarityHint(input.text), source: "offline", note: "Heuristic hint only — not a real plagiarism check." };
  }),
});
