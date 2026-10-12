import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Wand2, Loader2, Check } from "lucide-react";

export default function AIPanel({ text, setText }) {
  const [tone, setTone] = useState("formal");
  const [mode, setMode] = useState("professional");
  const [topic, setTopic] = useState("");
  const [docType, setDocType] = useState("proposal");
  const [citeRaw, setCiteRaw] = useState("");
  const [citeStyle, setCiteStyle] = useState("apa");
  const [result, setResult] = useState("");
  const [issues, setIssues] = useState([]);
  const [busy, setBusy] = useState(null);
  const grammarM = trpc.ai.grammar.useMutation();
  const rewriteM = trpc.ai.rewrite.useMutation();
  const summaryM = trpc.ai.summarize.useMutation();
  const outlineM = trpc.ai.outline.useMutation();
  const citeM = trpc.ai.cite.useMutation();
  const simM = trpc.ai.similarity.useMutation();

  const run = async (key, fn) => {
    setBusy(key); setResult(""); setIssues([]);
    try {
      const r = await fn();
      if (r.fixed || r.text) {
        setResult(r.fixed || r.text);
        if (r.issues) setIssues(r.issues);
        toast.success("Done (" + (r.source === "ai" ? "AI" : "offline") + ")");
      } else if (r.score !== undefined) {
        setResult(r.message + " (score " + r.score + "/100, " + r.level + ")");
        toast.success("Similarity hint ready");
      }
    } catch (e) {
      toast.error(e.message || "AI action failed.");
    } finally {
      setBusy(null);
    }
  };
  const apply = () => {
    if (!result) return;
    setText(result);
    toast.success("Applied to editor");
  };
  const btn = (key, label, fn) => (
    <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => run(key, fn)}>
      {busy === key ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}{label}
    </Button>
  );
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Wand2 className="w-4 h-4" /> Improve your writing with AI
      </h3>
      <Tabs defaultValue="fix">
        <TabsList>
          <TabsTrigger value="fix">Fix grammar</TabsTrigger>
          <TabsTrigger value="rewrite">Rewrite</TabsTrigger>
          <TabsTrigger value="sum">Summarize</TabsTrigger>
          <TabsTrigger value="gen">Make outline</TabsTrigger>
          <TabsTrigger value="cite">References</TabsTrigger>
          <TabsTrigger value="sim">Check originality</TabsTrigger>
        </TabsList>
        <TabsContent value="fix" className="space-y-2">
          <div className="flex gap-2 items-center">
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="none">No tone change</SelectItem>
              </SelectContent>
            </Select>
            {btn("grammar", "Check grammar", () => grammarM.mutateAsync({ text, tone }))}
          </div>
          {issues.length > 0 && (
            <ul className="text-xs space-y-1 max-h-28 overflow-auto">
              {issues.slice(0, 12).map((is, i) => (
                <li key={i}>- [{is.type}] {is.original} to {is.suggestion}</li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="rewrite" className="space-y-2">
          <div className="flex gap-2 items-center">
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="shorter">Shorter</SelectItem>
                <SelectItem value="clearer">Clearer</SelectItem>
              </SelectContent>
            </Select>
            {btn("rewrite", "Rewrite", () => rewriteM.mutateAsync({ text, mode }))}
          </div>
        </TabsContent>
        <TabsContent value="sum" className="space-y-2">
          {btn("sum", "Generate summary", () => summaryM.mutateAsync({ text, sentences: 4 }))}
        </TabsContent>
        <TabsContent value="gen" className="space-y-2">
          <div className="flex gap-2">
            <Input placeholder="Topic e.g. cassava processing" value={topic} onChange={(e) => setTopic(e.target.value)} />
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="thesis">Thesis</SelectItem>
              </SelectContent>
            </Select>
            {btn("outline", "Draft", () => outlineM.mutateAsync({ topic: topic || "My topic", docType }))}
          </div>
        </TabsContent>
        <TabsContent value="cite" className="space-y-2">
          <div className="flex gap-2">
            <Input placeholder="Author, Title, Publisher, Year" value={citeRaw} onChange={(e) => setCiteRaw(e.target.value)} />
            <Select value={citeStyle} onValueChange={setCiteStyle}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="apa">APA</SelectItem>
                <SelectItem value="mla">MLA</SelectItem>
                <SelectItem value="harvard">Harvard</SelectItem>
              </SelectContent>
            </Select>
            {btn("cite", "Format", () => citeM.mutateAsync({ raw: citeRaw, style: citeStyle }))}
          </div>
        </TabsContent>
        <TabsContent value="sim" className="space-y-2">
          {btn("sim", "Check similarity hint", () => simM.mutateAsync({ text }))}
          <p className="text-[11px] text-muted-foreground">Heuristic only — not a real plagiarism detector.</p>
        </TabsContent>
      </Tabs>
      {result && (
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <p className="text-xs whitespace-pre-wrap max-h-48 overflow-auto">{result.slice(0, 4000)}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={apply}><Check className="w-3 h-3 mr-1" />Apply to editor</Button>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(result); toast.success("Copied"); }}>Copy</Button>
          </div>
        </div>
      )}
    </div>
  );
}
