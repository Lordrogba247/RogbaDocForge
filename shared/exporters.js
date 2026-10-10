import { cleanupParagraphs, detectHeadings } from "./smartFormat.js";

function esc(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function inlineMd(s) {
  let t = esc(s);
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*(.+?)\*/g, "<em>$1</em>");
  t = t.replace(/__(.+?)__/g, "<u>$1</u>");
  return t;
}
export function buildHtmlDocument(rawText, opts = {}) {
  const title = opts.title || "Document";
  const cleaned = cleanupParagraphs(rawText || "");
  const lines = cleaned.split("\n");
  const detected = opts.autoHeadings === false
    ? lines.map((l) => ({ line: l, level: 0, text: l }))
    : detectHeadings(lines);
  const tocOn = !!opts.toc;
  let tableCount = 0;
  const accent = opts.brandAccent || "#6d28d9";
  const headingColor = "#1e1b4b";
  const font = opts.font || "Arial,Helvetica,sans-serif";
  const dir = opts.rtl ? "rtl" : "ltr";
  const alignCss = opts.align === "justify" ? "justify" : opts.align === "center" ? "center" : opts.align === "right" ? "right" : (opts.rtl ? "right" : "left");
  const body = [];
  if (opts.cover) {
    body.push("<div class='cover'><div class='bar'></div>");
    body.push("<h1>" + esc(title) + "</h1>");
    if (opts.coverName) body.push("<p class='cname'>" + esc(opts.coverName) + "</p>");
    if (opts.coverDate) body.push("<p class='cdate'>" + esc(opts.coverDate) + "</p>");
    body.push("</div>");
  } else {
    body.push("<h1 class='doctitle'>" + esc(title) + "</h1>");
  }
  if (tocOn) {
    body.push("<h2>Table of Contents</h2><ul>");
    detected.filter((d) => d.level > 0).forEach((d) => {
      body.push("<li style='margin-left:" + ((d.level - 1) * 18) + "px'>" + inlineMd((d.text || d.line).trim()) + "</li>");
    });
    body.push("</ul>");
  }
  detected.forEach((d) => {
    const line = ((d.text || d.line) || "").trim();
    if (!line) return;
    if (d.level === 1) body.push("<h2>" + inlineMd(line) + "</h2>");
    else if (d.level === 2) body.push("<h3>" + inlineMd(line) + "</h3>");
    else if (d.level === 3) body.push("<h4>" + inlineMd(line) + "</h4>");
    else if (/^[-*\u2022]\s+/.test(line)) body.push("<p>&bull; " + inlineMd(line.replace(/^[-*\u2022]\s+/, "")) + "</p>");
    else if (/^\d+[.)]\s+/.test(line)) body.push("<p>" + inlineMd(line) + "</p>");
    else if (line.includes("|") && line.split("|").length >= 3) {
      const cells = line.split("|").map((c) => "<td>" + inlineMd(c.trim()) + "</td>").join("");
      tableCount++;
      body.push("<table class='tbl'><tr>" + cells + "</tr></table><p class='cap'>Table " + tableCount + "</p>");
    }
    else body.push("<p>" + inlineMd(line) + "</p>");
  });
  (opts.images || []).forEach((im, i) => {
    if (!im.dataUrl) return;
    body.push("<div style='text-align:" + (im.align || "center") + "'><img src='" + im.dataUrl + "' style='max-width:100%'/><p class='cap'>Figure " + (i + 1) + ": " + esc(im.caption || "") + "</p></div>");
  });
  if (opts.watermark) body.push("<p class='watermark'>" + esc(opts.watermark) + "</p>");
  if (opts.signatureName) body.push("<div class='sig'>________________________________<br/><strong>" + esc(opts.signatureName) + "</strong><br/>" + esc(opts.signatureTitle || "") + "</div>");
  const css = "body{font-family:" + font + ";max-width:800px;margin:24px auto;padding:0 16px;line-height:1.6;color:#222;text-align:" + alignCss + "}"
    + ".doctitle{text-align:center;border-bottom:3px solid " + accent + ";padding-bottom:10px;color:" + headingColor + "}"
    + "h2{color:" + headingColor + "}h3{color:#333}.cover{text-align:center;padding:80px 0;border-bottom:3px solid " + accent + "}"
    + ".bar{width:40%;height:6px;background:" + accent + ";margin:0 auto 16px;border-radius:3px}"
    + ".tbl{border-collapse:collapse;width:100%;margin:8px 0}.tbl td{border:1px solid #999;padding:5px 8px}"
    + ".cap{font-style:italic;font-size:12px;color:#555;text-align:center}.watermark{text-align:center;color:#999;font-weight:bold}.sig{margin-top:24px}";
  const head = opts.header ? "<header style='text-align:center;color:#666;font-size:12px'>" + esc(opts.header) + "</header>" : "";
  const foot = (opts.footer || opts.pageNumbers) ? "<footer style='text-align:center;color:#666;font-size:12px'>" + esc(opts.footer || "") + "</footer>" : "";
  return "<!DOCTYPE html><html dir='" + dir + "'><head><meta charset='utf-8'><title>" + esc(title) + "</title><style>" + css + "</style></head><body>" + head + body.join("\n") + foot + "</body></html>";
}
export function buildMarkdownDocument(rawText, opts = {}) {
  const title = opts.title || "Document";
  const cleaned = cleanupParagraphs(rawText || "");
  const lines = cleaned.split("\n");
  const detected = opts.autoHeadings === false
    ? lines.map((l) => ({ line: l, level: 0, text: l }))
    : detectHeadings(lines);
  const out = [];
  if (opts.cover) {
    out.push("# " + title);
    if (opts.coverName) out.push("\n*" + opts.coverName + "*");
    if (opts.coverDate) out.push("\n*" + opts.coverDate + "*");
    out.push("\n---\n");
  } else {
    out.push("# " + title + "\n");
  }
  if (opts.toc) {
    out.push("## Table of Contents\n");
    detected.filter((d) => d.level > 0).forEach((d) => {
      const pad = "  ".repeat(d.level - 1);
      out.push(pad + "- " + (d.text || d.line).trim());
    });
    out.push("");
  }
  detected.forEach((d) => {
    const line = ((d.text || d.line) || "").trim();
    if (!line) { out.push(""); return; }
    if (d.level === 1) out.push("\n## " + line.replace(/^#{1,3}\s+/, ""));
    else if (d.level === 2) out.push("\n### " + line.replace(/^#{1,3}\s+/, ""));
    else if (d.level === 3) out.push("\n#### " + line.replace(/^#{1,3}\s+/, ""));
    else out.push(line);
  });
  return out.join("\n");
}
