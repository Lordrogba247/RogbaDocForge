import { useMemo, useState } from "react";
import { smartFormatPreview } from "@shared/smartFormat.js";
import { buildHtmlDocument } from "@shared/exporters.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Columns2, Eye } from "lucide-react";

export default function LivePreview({ text, options, title }) {
  const [mode, setMode] = useState("split");
  const opts = options || {};
  const preview = useMemo(
    () => smartFormatPreview(text || "", { autoHeadings: opts.autoHeadings !== false }),
    [text, opts.autoHeadings]
  );
  const html = useMemo(
    () => {
      try {
        return buildHtmlDocument(preview.cleaned || text || "", { ...opts, title: title || "Preview" });
      } catch {
        return "<p>Preview unavailable</p>";
      }
    },
    [preview.cleaned, text, opts, title]
  );
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Eye className="w-4 h-4" /> See before & after
        </h3>
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList>
            <TabsTrigger value="split"><Columns2 className="w-3 h-3 mr-1" />Side-by-side</TabsTrigger>
            <TabsTrigger value="doc">Document</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {mode === "split" ? (
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-secondary/20 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Before (raw)</p>
            <p className="text-xs whitespace-pre-wrap max-h-72 overflow-auto">{(text || "").slice(0, 4000) || "Type or upload text..."}</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">After (formatted)</p>
            <iframe title="after" className="w-full h-72 rounded bg-white" srcDoc={html} sandbox="" />
          </div>
        </div>
      ) : (
        <iframe title="doc" className="w-full h-96 rounded border bg-white" srcDoc={html} sandbox="" />
      )}
      <p className="text-[11px] text-muted-foreground">
        {preview.stats.headings} headings • {preview.stats.paragraphs} paragraphs • formatted with {opts.theme || "modern"} theme
        {opts.academic && opts.academic !== "none" ? ` • ${opts.academic.toUpperCase()} style` : ""}.
      </p>
    </div>
  );
}
