import { describe, expect, it } from "vitest";
import { grammarCheck, rewriteText } from "@shared/aiTools.js";
import { autoSummary, generateOutline } from "@shared/aiTools.js";
import { formatCitation, similarityHint } from "@shared/aiTools.js";

describe("ai tools offline engine", () => {
  it("fixes common spelling", () => {
    const r = grammarCheck("This is teh test.");
    expect(r.fixed).toContain("the");
    expect(r.issueCount).toBeGreaterThan(0);
  });
  it("rewrites shorter", () => {
    const t = "First sentence here. Second sentence here. Third sentence here. Fourth sentence here.";
    const r = rewriteText(t, "shorter");
    expect(r.length).toBeLessThan(t.length);
  });
  it("summarizes extractively", () => {
    const t = "Dogs are loyal. Dogs need food. Cats are independent. Dogs love walks. Cats love naps. Dogs bark loudly.";
    const s = autoSummary(t, 2);
    expect(s.split(".").filter(Boolean).length).toBeLessThanOrEqual(3);
  });
  it("generates outline", () => {
    const o = generateOutline("cassava business", "proposal");
    expect(o).toContain("CASSAVA");
    expect(o).toContain("BUDGET");
  });
  it("formats citations", () => {
    expect(formatCitation("Adeyemi, Business Guide, Lagos Press, 2020", "apa")).toContain("2020");
    expect(formatCitation("Adeyemi, Business Guide, Lagos Press, 2020", "mla")).toContain('"');
  });
  it("similarity hint flags dupes", () => {
    const t = "This is a fairly long unique sentence about cassava processing in Nigeria today. This is a fairly long unique sentence about cassava processing in Nigeria today.";
    const r = similarityHint(t);
    expect(r.duplicateSentences).toBeGreaterThan(0);
  });
});
