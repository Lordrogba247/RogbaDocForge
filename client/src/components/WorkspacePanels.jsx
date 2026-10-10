import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Save, Trash2, History, Loader2 } from "lucide-react";

const LS_TPL = "rdf_custom_templates";
const LS_VER = "rdf_doc_versions";
function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export default function WorkspacePanels({ text, setText, options, setOptions }) {
  const { isAuthenticated } = useAuth();
  const [tplName, setTplName] = useState("");
  const [localTpls, setLocalTpls] = useState(() => loadLS(LS_TPL, []));
  const [localVers, setLocalVers] = useState(() => loadLS(LS_VER, []));
  const utils = trpc.useUtils();
  const tplQuery = trpc.workspace.listTemplates.useQuery(undefined, { enabled: isAuthenticated });
  const verQuery = trpc.workspace.listVersions.useQuery({ docKey: "main" }, { enabled: isAuthenticated });
  const saveTplM = trpc.workspace.saveTemplate.useMutation();
  const delTplM = trpc.workspace.deleteTemplate.useMutation();
  const saveVerM = trpc.workspace.saveVersion.useMutation();
  useEffect(() => { try { localStorage.setItem(LS_TPL, JSON.stringify(localTpls.slice(0, 30))); } catch {} }, [localTpls]);
  useEffect(() => { try { localStorage.setItem(LS_VER, JSON.stringify(localVers.slice(0, 20))); } catch {} }, [localVers]);
  const saveTemplateLocal = async () => {
    const name = tplName.trim() || ("Template " + (localTpls.length + 1));
    const entry = { id: Date.now(), name, options: { ...options } };
    setLocalTpls((a) => [entry, ...a].slice(0, 30));
    if (isAuthenticated) {
      try {
        await saveTplM.mutateAsync({ name, optionsJson: JSON.stringify(options) });
        utils.workspace.listTemplates.invalidate();
      } catch (e) { toast.error(e.message || "Cloud save failed"); return; }
    }
    setTplName("");
    toast.success("Template saved");
  };
  const applyTemplate = (opts) => {
    setOptions({ ...options, ...opts });
    toast.success("Template applied");
  };
  const saveVersionLocal = async () => {
    if (!text.trim()) { toast.error("Nothing to save yet"); return; }
    const entry = { id: Date.now(), label: new Date().toLocaleString(), preview: text.slice(0, 160), full: text, createdAt: Date.now() };
    setLocalVers((a) => [entry, ...a].slice(0, 20));
    if (isAuthenticated) {
      try {
        await saveVerM.mutateAsync({ docKey: "main", text, label: entry.label });
        utils.workspace.listVersions.invalidate();
      } catch (e) { toast.error(e.message || "Cloud save failed"); return; }
    }
    toast.success("Version saved");
  };
  const cloudTpls = (tplQuery.data || []).map((t) => {
    let opts = {};
    try { opts = JSON.parse(t.optionsJson); } catch {}
    return { id: "c-" + t.id, cloudId: t.id, name: t.name, options: opts };
  });
  const cloudVers = (verQuery.data || []).map((v) => ({ id: "c-" + v.id, label: v.label, preview: v.preview, full: v.full }));
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Save className="w-4 h-4" /> My templates (24)
        </h3>
        <div className="flex gap-2">
          <Input placeholder="Template name" value={tplName} onChange={(e) => setTplName(e.target.value)} />
          <Button size="sm" onClick={saveTemplateLocal}>Save</Button>
        </div>
        <div className="space-y-2 max-h-44 overflow-auto">
          {[...cloudTpls, ...localTpls].length === 0 && <p className="text-xs text-muted-foreground">No saved templates yet.</p>}
          {[...cloudTpls, ...localTpls].map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-sm rounded-lg border bg-card px-3 py-2">
              <span className="flex-1 truncate">{t.name}</span>
              <Button variant="ghost" size="sm" onClick={() => applyTemplate(t.options)}>Apply</Button>
              <Button variant="ghost" size="sm" onClick={async () => {
                if (String(t.id).startsWith("c-")) {
                  await delTplM.mutateAsync({ id: t.cloudId });
                  utils.workspace.listTemplates.invalidate();
                } else {
                  setLocalTpls((a) => a.filter((x) => x.id !== t.id));
                }
              }}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <History className="w-4 h-4" /> Versions (25)
        </h3>
        <Button size="sm" variant="outline" onClick={saveVersionLocal} disabled={saveVerM.isPending}>
          {saveVerM.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}Save snapshot
        </Button>
        <div className="space-y-2 max-h-44 overflow-auto">
          {[...cloudVers, ...localVers].length === 0 && <p className="text-xs text-muted-foreground">No versions yet.</p>}
          {[...cloudVers, ...localVers].map((v) => (
            <div key={v.id} className="flex items-center gap-2 text-sm rounded-lg border bg-card px-3 py-2">
              <span className="flex-1 truncate">{v.label} - {v.preview?.slice(0, 60)}</span>
              <Button variant="ghost" size="sm" onClick={() => { setText(v.full); toast.success("Restored"); }}>Restore</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
