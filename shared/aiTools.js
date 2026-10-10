export function splitSentences(text) {
  return (text || "").replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]+["']?|\S[^.!?]*$/g)
    ?.map((s) => s.trim()).filter(Boolean) || [];
}
export function grammarCheck(text, opts = {}) {
  const issues = [];
  let fixed = text || "";
  const fixes = [
    [/\bteh\b/gi, "the"], [/\brecieve\b/gi, "receive"],
    [/\bseperate\b/gi, "separate"], [/\boccured\b/gi, "occurred"],
    [/\bdefinately\b/gi, "definitely"], [/\bgoverment\b/gi, "government"],
    [/\bbusines\b/gi, "business"], [/\bwich\b/gi, "which"],
    [/\balot\b/gi, "a lot"], [/\bcant\b/gi, "can't"],
    [/\bdont\b/gi, "don't"], [/\bwont\b/gi, "won't"],
  ];
  fixes.forEach(([re, rep]) => {
    // NOTE: no global-flag .test() here (lastIndex trap) — replace() scans fully.
    fixed = fixed.replace(re, (m) => {
      issues.push({ type: "spelling", original: m, suggestion: rep });
      return /^[A-Z]/.test(m) ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep;
    });
  });
  const tone = opts.tone || "formal";
  const swaps = tone === "formal"
    ? [["get", "obtain"], ["a lot of", "numerous"], ["really", "highly"], ["show", "demonstrate"], ["help", "assist"], ["use", "utilize"]]
    : [["utilize", "use"], ["obtain", "get"], ["commence", "start"]];
  swaps.forEach(([from, to]) => {
    // Safari-safe word boundary (no lookbehind): match with separators, keep them.
    const escFrom = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp("(^|[^A-Za-z])(" + escFrom + ")(?![A-Za-z])", "gi");
    if (re.test(fixed)) {
      fixed = fixed.replace(new RegExp("(^|[^A-Za-z])(" + escFrom + ")(?![A-Za-z])", "gi"), "$1" + to);
      issues.push({ type: "tone", original: from, suggestion: to });
    }
  });
  if (/  +/.test(fixed)) {
    fixed = fixed.replace(/  +/g, " ");
    issues.push({ type: "spacing", original: "double", suggestion: "single" });
  }
  fixed = fixed.replace(/\b(\w+)\s+\1\b/gi, (m, w) => {
    issues.push({ type: "repeat", original: m, suggestion: w });
    return w;
  });
  return { fixed, issues: issues.slice(0, 50), issueCount: issues.length };
}
export function rewriteText(text, mode = "professional") {
  if (!text) return "";
  let t = (text || "").trim();
  if (mode === "shorter") {
    const s = splitSentences(t);
    t = s.map((x) => x.replace(/\b(very|really|quite|just)\b/gi, "").replace(/\s{2,}/g, " ").trim())
      .filter(Boolean).slice(0, Math.max(1, Math.ceil(s.length * 0.7))).join(" ");
  } else if (mode === "clearer") {
    t = t.replace(/\butilize\b/gi, "use").replace(/\bcommence\b/gi, "start")
      .replace(/\bterminate\b/gi, "end").replace(/\bapproximately\b/gi, "about");
  } else {
    t = grammarCheck(t, { tone: "formal" }).fixed;
  }
  return t.replace(/\s{2,}/g, " ").trim();
}
export function autoSummary(text, maxS = 4) {
  const sents = splitSentences(text);
  if (sents.length <= maxS) return sents.join(" ");
  const words = text.toLowerCase().match(/[a-z]{3,}/g) || [];
  const freq = {};
  words.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });
  const scored = sents.map((s, i) => {
    const ws = s.toLowerCase().match(/[a-z]{3,}/g) || [];
    const score = ws.reduce((a, w) => a + (freq[w] || 0), 0) / Math.max(1, ws.length) + (i === 0 ? 2 : 0);
    return { s, i, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, maxS)
    .sort((a, b) => a.i - b.i).map((x) => x.s).join(" ");
}
export function generateOutline(topic, docType = "proposal") {
  const t = (topic || "Your Topic").trim() || "Your Topic";
  const map = {
    proposal: ["EXECUTIVE SUMMARY", "OBJECTIVES", "SCOPE", "TIMELINE", "BUDGET", "CONCLUSION"],
    report: ["ABSTRACT", "1. INTRODUCTION", "2. METHODOLOGY", "3. FINDINGS", "4. CONCLUSION", "REFERENCES"],
    thesis: ["ABSTRACT", "CHAPTER 1: INTRODUCTION", "CHAPTER 2: LITERATURE REVIEW", "CHAPTER 3: METHODOLOGY", "CHAPTER 4: RESULTS", "CHAPTER 5: CONCLUSION", "REFERENCES"],
  };
  const secs = map[docType] || ["INTRODUCTION", "MAIN POINTS", "DETAILS", "CONCLUSION"];
  let out = t.toUpperCase() + "\n\n";
  secs.forEach((s) => { out += s + "\n[Write 2-3 sentences on " + s.toLowerCase() + ' for "' + t + '"]\n\n'; });
  return out.trim();
}
export function formatCitation(raw, style = "apa") {
  const parts = (raw || "").split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  const author = parts[0] || "Author";
  const year = (raw.match(/\b(19|20)\d{2}\b/) || ["n.d."])[0];
  const title = parts[1] || "Title of work";
  const source = parts[2] || "Publisher";
  if (style === "mla") return author + '. "' + title + '." ' + source + ", " + year + ".";
  if (style === "harvard") return author + " (" + year + ") '" + title + "', " + source + ".";
  return author + " (" + year + "). " + title + ". " + source + ".";
}
export function similarityHint(text) {
  const sents = splitSentences(text);
  const seen = new Map();
  let dupes = 0;
  sents.forEach((s) => {
    const k = s.toLowerCase().replace(/[^a-z ]/g, "").trim();
    if (k.length < 20) return;
    if (seen.has(k)) dupes++;
    else seen.set(k, 1);
  });
  // long copied-looking sentences
  const longCount = sents.filter((s) => s.split(/\s+/).length > 45).length;
  const score = sents.length ? Math.min(100, Math.round(((dupes * 2 + longCount) / sents.length) * 100)) : 0;
  const level = score < 10 ? "low" : score < 30 ? "medium" : "high";
  return {
    score, level, duplicateSentences: dupes, longSentences: longCount,
    message: level === "low" ? "Looks original. No major repetition." : level === "medium"
      ? "Some repeated/long sentences — consider paraphrasing." : "High repetition — rewrite flagged sentences.",
  };
}

