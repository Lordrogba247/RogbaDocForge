import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Upload, FileUp, Loader2 } from "lucide-react";

const ACCEPT = ".txt,.md,.markdown,.html,.htm,.csv,.docx,.pdf";

export default function UploadZone({ onTextLoaded }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const parseMutation = trpc.conversion.parseUpload.useMutation();

  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const result = await parseMutation.mutateAsync({ fileData: dataUrl, fileName: file.name });
      if (!result.text?.trim()) {
        toast.error("No readable text found in that file.");
        return;
      }
      onTextLoaded(result.text, file.name);
      toast.success(`Loaded ${file.name}`);
    } catch (e) {
      toast.error(e.message || "Could not read file.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <FileUp className="w-4 h-4" /> Upload a file
        </h3>
      </div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer bg-secondary/30"
      >
        <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground truncate">
          {busy ? "Reading file..." : "Click or drag .txt .md .html .csv .docx .pdf here"}
        </span>
        {busy && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">Text is extracted into the editor — paste still works too. PDFs/images with only scans may need OCR.</p>
    </div>
  );
}
