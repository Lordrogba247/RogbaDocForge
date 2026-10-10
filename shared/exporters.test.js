import { describe, expect, it } from "vitest";
import { buildHtmlDocument, buildMarkdownDocument } from "@shared/exporters.js";

describe("exporters", () => {
  it("builds HTML with title and headings", () => {
    const html = buildHtmlDocument("MY TITLE\n\nBody text", { title: "Doc", autoHeadings: true });
    expect(html).toContain("<h1");
    expect(html).toContain("MY TITLE");
  });
  it("builds markdown with TOC", () => {
    const md = buildMarkdownDocument("# Title\n\nBody\n\n## Sec", { title: "Doc", toc: true });
    expect(md).toContain("Table of Contents");
    expect(md).toContain("# Doc");
  });
});
