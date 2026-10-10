import { describe, expect, it } from "vitest";
import { detectHeadings, cleanupParagraphs } from "@shared/smartFormat.js";
import { smartFormatPreview, buildTOC } from "@shared/smartFormat.js";

describe("smart formatting core", () => {
  it("detects ALL CAPS headings", () => {
    const d = detectHeadings(["EXECUTIVE SUMMARY", "", "Some body text here."]);
    expect(d[0].level).toBe(1);
  });
  it("detects numbered headings", () => {
    const d = detectHeadings(["1. INTRODUCTION", "body", "1.1 Background", "body"]);
    expect(d[0].level).toBe(1);
    expect(d[2].level).toBe(2);
  });
  it("detects colon headings", () => {
    const d = detectHeadings(["Findings:", "body text here"]);
    expect(d[0].level).toBe(2);
  });
  it("cleans paragraphs", () => {
    expect(cleanupParagraphs("hello   world  \n\n\nnext")).toBe("hello world\n\nnext");
  });
  it("builds TOC", () => {
    const p = smartFormatPreview("# Title\n\nBody\n\n## Section\n\nMore");
    expect(p.toc.length).toBe(2);
    expect(buildTOC(p.detected).length).toBe(2);
  });
});
