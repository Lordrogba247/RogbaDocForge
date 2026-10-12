import { useMemo, useState } from "react";
import { DOCUMENT_TEMPLATES, ACADEMIC_PRESETS, THEME_PRESETS } from "@shared/smartFormat.js";
import { smartFormatPreview, getTemplateStarter } from "@shared/smartFormat.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Eye, Undo2, FileText } from "lucide-react";

export default function SmartFormatPanel({ text, setText, options, setOptions }) {
  const [tab, setTab] = useState("before");
  const [history, setHistory] = useState([]);
  const opts = options || {};
  const safeText = text || "";
  const preview = useMemo(() => smartFormatPreview(safeText, { autoHeadings: opts.autoHeadings !== false }), [safeText, opts.autoHeadings]);
  const set = (k, v) => setOptions({ ...opts, [k]: v });
  const applyTemplate = (id) => {
    if (safeText.trim()) setHistory((h) => [...h.slice(-9), safeText]);
    const starter = getTemplateStarter(id);
    if (starter) setText(starter);
    set("template", id);
  };
  const undo = () => {
    if (!history.length) return;
    setText(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  };
  const cleanupNow = () => {
    if (!safeText.trim()) return;
    setHistory((h) => [...h.slice(-9), safeText]);
    setText(preview.cleaned);
  };
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Step 3 — Make it look professional
        </h3>
        <p className="text-sm text-muted-foreground -mt-2">Choose a starting layout, then fine-tune headings, style and pages.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={undo} disabled={!history.length}><Undo2 className="w-3 h-3 mr-1" />Undo</Button>
          <Button variant="outline" size="sm" onClick={cleanupNow}><Sparkles className="w-3 h-3 mr-1" />Clean up</Button>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium">Starting layout</label>
          <Select value={opts.template || "blank"} onValueChange={applyTemplate}>
            <SelectTrigger className="w-full mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.values(DOCUMENT_TEMPLATES).map((t) => (<SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium">School style (APA / MLA)</label>
          <Select value={opts.academic || "none"} onValueChange={(v) => set("academic", v)}>
            <SelectTrigger className="w-full mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.values(ACADEMIC_PRESETS).map((a) => (<SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium">Look & feel</label>
          <Select value={opts.theme || "modern"} onValueChange={(v) => set("theme", v)}>
            <SelectTrigger className="w-full mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.values(THEME_PRESETS).map((t) => (<SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid sm:grid-cols-4 gap-2">
        <div>
          <label className="text-xs font-medium">Text alignment</label>
          <Select value={opts.align || "left"} onValueChange={(v) => set("align", v)}>
            <SelectTrigger className="w-full mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="justify">Justified</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between text-xs pt-6"><span>Detect headings</span><Switch checked={opts.autoHeadings !== false} onCheckedChange={(v) => set("autoHeadings", v)} /></div>
        <div className="flex items-center justify-between text-xs pt-6"><span>Contents page</span><Switch checked={!!opts.toc} onCheckedChange={(v) => set("toc", v)} /></div>
        <div className="flex items-center justify-between text-xs pt-6"><span>Cover page</span><Switch checked={!!opts.cover} onCheckedChange={(v) => set("cover", v)} /></div>
      </div>
      <div className="grid sm:grid-cols-4 gap-2">
        <Input placeholder="Name on cover" value={opts.coverName || ""} onChange={(e) => set("coverName", e.target.value)} />
        <Input placeholder="Date on cover" value={opts.coverDate || ""} onChange={(e) => set("coverDate", e.target.value)} />
        <Input placeholder="Top of every page (e.g. your name)" value={opts.header || ""} onChange={(e) => set("header", e.target.value)} />
        <Input placeholder="Bottom of every page" value={opts.footer || ""} onChange={(e) => set("footer", e.target.value)} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span>Page numbers</span><Switch checked={opts.pageNumbers !== false} onCheckedChange={(v) => set("pageNumbers", v)} />
      </div>
      <div className="rounded-lg border bg-card p-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="before"><FileText className="w-3 h-3 mr-1" />Before</TabsTrigger>
            <TabsTrigger value="after"><Eye className="w-3 h-3 mr-1" />After</TabsTrigger>
            <TabsTrigger value="toc">TOC ({preview.toc.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="before"><p className="text-xs whitespace-pre-wrap max-h-40 overflow-auto">{safeText.slice(0, 2000) || "Type text..."}</p></TabsContent>
          <TabsContent value="after">
            <div className="max-h-48 overflow-auto space-y-1">
              {preview.detected.slice(0, 60).map((d, i) => (
                d.level > 0
                  ? <div key={i} className={d.level === 1 ? "font-bold" : "font-semibold text-sm"} style={{ marginLeft: (d.level - 1) * 12 }}>{(d.text || d.line).replace(/^#{1,3}\s+/, "")}</div>
                  : <div key={i} className="text-xs text-muted-foreground">{d.line}</div>
              ))}
            </div>
            <p className="text-[11px] mt-2 text-muted-foreground">{preview.stats.headings} headings, {preview.stats.paragraphs} paragraphs. Lists auto-detected (5).</p>
          </TabsContent>
          <TabsContent value="toc">
            {preview.toc.length === 0 ? <p className="text-xs text-muted-foreground">No headings yet.</p> : (
              <ul className="text-xs space-y-1">{preview.toc.map((t) => (<li key={t.index} style={{ marginLeft: (t.level - 1) * 12 }}>- {t.text}</li>))}</ul>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
