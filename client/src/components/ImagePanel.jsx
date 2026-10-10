import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";

export default function ImagePanel({ options, setOptions }) {
  const [caption, setCaption] = useState("");
  const [align, setAlign] = useState("center");
  const images = options.images || [];
  const addFiles = (files) => {
    const current = options.images || [];
    const list = Array.from(files || []).slice(0, 10 - current.length);
    if (!list.length) { toast.error("Max 10 images"); return; }
    list.forEach((f) => {
      if (f.size > 4 * 1024 * 1024) { toast.error(f.name + " over 4MB"); return; }
      const cap = caption;
      const al = align;
      const r = new FileReader();
      r.onload = () => {
        setOptions((prev) => ({ ...prev, images: [...(prev.images || []), { dataUrl: r.result, caption: cap, align: al, widthCm: 12 }] }));
      };
      r.readAsDataURL(f);
    });
    setCaption("");
  };
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <ImagePlus className="w-4 h-4" /> Images (21) + Tables (22 auto)
      </h3>
      <div className="flex gap-2">
        <Input placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
        <Select value={align} onValueChange={setAlign}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
        <label className="inline-flex items-center px-3 py-2 rounded-md border text-sm cursor-pointer">
          Add
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        </label>
      </div>
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((im, i) => (
            <div key={i} className="relative rounded-lg border overflow-hidden bg-card">
              <img src={im.dataUrl} alt="" className="h-20 w-full object-cover" />
              <Button variant="ghost" size="sm" className="absolute top-1 right-1" onClick={() => {
                const next = images.filter((_, j) => j !== i);
                setOptions({ ...options, images: next });
              }}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">Images get Figure 1, 2... captions in Word/PDF. Tables: use A | B | C lines — styled automatically with captions.</p>
    </div>
  );
}
