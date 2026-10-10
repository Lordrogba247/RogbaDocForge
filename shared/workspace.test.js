import { describe, expect, it } from "vitest";
import { getStrings, isRTL } from "@shared/i18n.js";
import { buildHtmlDocument } from "@shared/exporters.js";

describe("locale + branding exports", () => {
  it("returns Yoruba/Hausa/Arabic strings", () => {
    expect(getStrings("yo").convert).toBeTruthy();
    expect(getStrings("ha").convert).toBeTruthy();
    expect(getStrings("ar").convert).toBeTruthy();
  });
  it("detects RTL only for Arabic", () => {
    expect(isRTL("ar")).toBe(true);
    expect(isRTL("en")).toBe(false);
    expect(isRTL("yo")).toBe(false);
  });
  it("applies brand accent + rtl + tables + images", () => {
    const html = buildHtmlDocument("A | B | C\nBody", {
      title: "T", brandAccent: "#123456", rtl: true,
      images: [{ dataUrl: "data:image/png;base64,xx", caption: "cap", align: "center" }],
      watermark: "DRAFT", signatureName: "Ada",
    });
    expect(html).toContain("#123456");
    expect(html).toContain("dir='rtl'");
    expect(html).toContain("Table 1");
    expect(html).toContain("Figure 1");
    expect(html).toContain("DRAFT");
    expect(html).toContain("Ada");
  });
});
