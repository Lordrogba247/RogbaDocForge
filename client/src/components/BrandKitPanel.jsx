import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Palette, Loader2 } from "lucide-react";

export default function BrandKitPanel({ options, setOptions }) {
  const { isAuthenticated } = useAuth();
  const [brand, setBrand] = useState({ logoUrl: "", primaryColor: "#6d28d9", headingColor: "#1e1b4b", font: "Calibri", watermark: "", signatureName: "", signatureTitle: "" });
  const brandQuery = trpc.workspace.getBrand.useQuery(undefined, { enabled: isAuthenticated });
  const saveM = trpc.workspace.saveBrand.useMutation();

  useEffect(() => {
    if (brandQuery.data) setBrand((prev) => ({ ...prev, ...brandQuery.data }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandQuery.data]);

  const applyToDoc = () => {
    setOptions({
      ...options,
      font: brand.font || options.font,
      brandAccent: brand.primaryColor || "",
      watermark: brand.watermark || "",
      signatureName: brand.signatureName || "",
      signatureTitle: brand.signatureTitle || "",
    });
    toast.success("Brand applied to document");
  };
  const save = async () => {
    try {
      await saveM.mutateAsync(brand);
      toast.success("Brand kit saved");
    } catch (e) {
      toast.error(e.message || "Save failed");
    }
  };
  const set = (k, v) => setBrand({ ...brand, [k]: v });

  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Palette className="w-4 h-4" /> Brand kit (19) {isAuthenticated ? "" : "— sign in to save"}
      </h3>
      <div className="grid sm:grid-cols-3 gap-2">
        <div><label className="text-xs">Primary color</label><Input type="color" value={brand.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="h-9 p-1" /></div>
        <div><label className="text-xs">Heading color</label><Input type="color" value={brand.headingColor} onChange={(e) => set("headingColor", e.target.value)} className="h-9 p-1" /></div>
        <div><label className="text-xs">Font</label><Input value={brand.font} onChange={(e) => set("font", e.target.value)} placeholder="Calibri" /></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <Input placeholder="Watermark text (23)" value={brand.watermark} onChange={(e) => set("watermark", e.target.value)} />
        <Input placeholder="Logo URL (optional)" value={brand.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} />
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <Input placeholder="Signature name (23)" value={brand.signatureName} onChange={(e) => set("signatureName", e.target.value)} />
        <Input placeholder="Signature title" value={brand.signatureTitle} onChange={(e) => set("signatureTitle", e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={applyToDoc}>Apply to document</Button>
        {isAuthenticated && (
          <Button size="sm" onClick={save} disabled={saveM.isPending}>
            {saveM.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save brand kit"}
          </Button>
        )}
      </div>
    </div>
  );
}
