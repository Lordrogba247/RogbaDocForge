import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Layers, Plus, Trash2, Loader2, Download } from "lucide-react";

export default function BatchPanel({ format, options }) {
  const [items, setItems] = useState([{ title: "", text: "" }]);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const batchMutation = trpc.conversion.batchConvert.useMutation();

  const setItem = (i, k, v) => setItems((arr) => arr.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const addItem = () => {
    if (items.length >= 10) { toast.error("Max 10 documents per batch."); return; }
    setItems((a) => [...a, { title: "", text: "" }]);
  };
  const removeItem = (i) => setItems((a) => a.filter((_, j) => j !== i));

  const runBatch = async () => {
    const docs = items.map((it, i) => ({
      title: it.title.trim() || `Document ${i + 1}`,
      text: it.text.trim(),
    })).filter((d) => d.text);
    if (!docs.length) { toast.error("Add at least one document with text."); return; }
    setBusy(true);
    setResults([]);
    try {
      const r = await batchMutation.mutateAsync({ docs, format, options });
      setResults(r.results || []);
      const ok = (r.results || []).filter((x) => x.ok).length;
      toast.success(`Batch done: ${ok}/${r.results.length} succeeded`);
    } catch (e) {
      toast.error(e.message || "Batch failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Layers className="w-4 h-4" /> Make many files at once
        </h3>
        <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Add doc</Button>
      </div>
      <div className="space-y-3 max-h-80 overflow-auto">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex gap-2">
              <Input placeholder={`Title ${i + 1}`} value={it.title} onChange={(e) => setItem(i, "title", e.target.value)} />
              {items.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeItem(i)}><Trash2 className="w-4 h-4" /></Button>
              )}
            </div>
            <Textarea placeholder="Paste text for this document..." value={it.text} onChange={(e) => setItem(i, "text", e.target.value)} className="min-h-[80px] text-sm" />
          </div>
        ))}
      </div>
      <Button onClick={runBatch} disabled={busy} className="w-full">
        {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Formatting batch...</> : <>Format {items.length} document(s) as {(format || "pdf").toUpperCase()}</>}
      </Button>
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-sm rounded-lg border bg-card px-3 py-2">
              <span className="flex-1 truncate">{r.title} — {r.ok ? "ready" : `failed: ${r.error}`}</span>
              {r.ok && (
                <Button variant="ghost" size="sm" onClick={() => {
                  const a = document.createElement("a");
                  a.href = r.url;
                  a.download = r.fileName || "document";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }} className="inline-flex items-center gap-1 text-primary">
                  <Download className="w-3 h-3" />{r.fileName}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
