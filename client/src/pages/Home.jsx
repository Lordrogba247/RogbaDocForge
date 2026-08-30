import { useState, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { FileText, FileSpreadsheet, Presentation, ImageIcon, Upload, X, Sparkles, Loader2, ArrowDownToLine, LogIn } from "lucide-react";
const formatConfig = {
  docx: {
    label: "Word",
    icon: <FileText className="w-5 h-5" />,
    color: "bg-blue-50 border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-100",
    darkColor: "dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 dark:hover:border-blue-600 dark:hover:bg-blue-900/40",
    ext: "docx"
  },
  pdf: {
    label: "PDF",
    icon: <FileText className="w-5 h-5" />,
    color: "bg-red-50 border-red-200 text-red-700 hover:border-red-400 hover:bg-red-100",
    darkColor: "dark:bg-red-950/40 dark:border-red-800 dark:text-red-300 dark:hover:border-red-600 dark:hover:bg-red-900/40",
    ext: "pdf"
  },
  pptx: {
    label: "PowerPoint",
    icon: <Presentation className="w-5 h-5" />,
    color: "bg-orange-50 border-orange-200 text-orange-700 hover:border-orange-400 hover:bg-orange-100",
    darkColor: "dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300 dark:hover:border-orange-600 dark:hover:bg-orange-900/40",
    ext: "pptx"
  },
  xlsx: {
    label: "Excel",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100",
    darkColor: "dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/40",
    ext: "xlsx"
  }
};
export default function Home() {
  const [text, setText] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [isConverting, setIsConverting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [downloadFileName, setDownloadFileName] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedImageName, setUploadedImageName] = useState(null);
  const {
    isAuthenticated,
    user,
    logout
  } = useAuth();
  const ocrMutation = trpc.conversion.ocrExtract.useMutation();
  const convertMutation = trpc.conversion.convertText.useMutation();
  const handleImageUpload = useCallback(e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setUploadedImage(dataUrl);
      setUploadedImageName(file.name);
    };
    reader.readAsDataURL(file);
  }, []);
  const handleExtractOCR = useCallback(async () => {
    if (!uploadedImage) {
      toast.error("Please upload an image first.");
      return;
    }
    setIsExtracting(true);
    try {
      const mimeType = uploadedImage.match(/^data:(image\/\w+);/)?.[1] || "image/jpeg";
      const result = await ocrMutation.mutateAsync({
        imageData: uploadedImage,
        mimeType: mimeType
      });
      setText(result.text);
      toast.success("Text extracted successfully!");
    } catch (err) {
      toast.error(err.message || "OCR extraction failed. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  }, [uploadedImage, isAuthenticated, ocrMutation]);
  const handleConvert = useCallback(async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to convert.");
      return;
    }
    setIsConverting(true);
    setDownloadUrl(null);
    setDownloadFileName(null);
    try {
      const result = await convertMutation.mutateAsync({
        text: text.trim(),
        format: selectedFormat,
        title: text.trim().split("\n")[0].substring(0, 80) || "Document"
      });
      setDownloadUrl(result.url);
      setDownloadFileName(result.fileName);
      toast.success(`${formatConfig[selectedFormat].label} file generated!`);
    } catch (err) {
      toast.error(err.message || "Conversion failed. Please try again.");
    } finally {
      setIsConverting(false);
    }
  }, [text, selectedFormat, isAuthenticated, convertMutation]);
  const handleDownload = useCallback(() => {
    if (downloadUrl) {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = downloadFileName || "document";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [downloadUrl, downloadFileName]);
  return <div className="min-h-screen bg-background">
    {/* Hero Section */}
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
      <div className="relative container py-12 lg:py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="font-serif text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            Forge Your Documents
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Convert text into Word, PDF, PowerPoint, or Excel files. Extract text from images with OCR. All in one elegant tool.
          </p>
        </div>
      </div>
    </section>

    {/* Main Converter */}
    <section className="container pb-20 -mt-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-2xl border border-border shadow-lg shadow-primary/5 overflow-hidden">
          {/* Format Selector */}
          <div className="p-6 border-b border-border">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Output Format
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.keys(formatConfig).map(fmt => <button key={fmt} onClick={() => {
                setSelectedFormat(fmt);
                setDownloadUrl(null);
                setDownloadFileName(null);
              }} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${selectedFormat === fmt ? "border-primary ring-2 ring-primary/20 scale-[1.02]" : ""} ${formatConfig[fmt].color} ${formatConfig[fmt].darkColor}`}>
                <span className="shrink-0">{formatConfig[fmt].icon}</span>
                <span className="font-medium text-sm">{formatConfig[fmt].label}</span>
              </button>)}
            </div>
          </div>

          {/* Text Editor + Image Upload */}
          <div className="p-6 space-y-6">
            {/* Image Upload Zone */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Image to Text (OCR)
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer bg-secondary/30">
                  <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">
                    {uploadedImageName || "Click to upload image (JPEG, PNG, WebP)"}
                  </span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
                  {uploadedImage && <button onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setUploadedImage(null);
                    setUploadedImageName(null);
                  }} className="ml-auto shrink-0 text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>}
                </label>
                {uploadedImage && <Button onClick={handleExtractOCR} disabled={isExtracting} variant="outline" className="shrink-0">
                  {isExtracting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Extract
                </Button>}
              </div>
            </div>

            {/* Text Area */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Document Text
                </h3>
                <span className="text-xs text-muted-foreground">
                  {text.length} characters
                </span>
              </div>
              <Textarea value={text} onChange={e => setText(e.target.value)} placeholder={`Type or paste your text here...

# Heading 1
## Heading 2
**Bold text** and *italic text*
- Bullet point
1. Numbered item

Or paste CSV data for Excel:
Name, Age, City
Alice, 30, New York
Bob, 25, London`} className="min-h-[280px] font-mono text-sm resize-y bg-secondary/20 border-border focus:border-primary/50 focus:ring-primary/20" />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Button onClick={handleConvert} disabled={isConverting || !text.trim()} className="flex-1 h-12 text-base font-semibold gap-2 bg-primary hover:bg-primary/90">
                {isConverting ? <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </> : <>
                  <Sparkles className="w-5 h-5" />
                  Convert to {formatConfig[selectedFormat].label}
                </>}
              </Button>

              {downloadUrl && <Button onClick={handleDownload} variant="outline" className="flex-1 h-12 text-base font-semibold gap-2 border-2 border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
                <ArrowDownToLine className="w-5 h-5" />
                Download .{formatConfig[selectedFormat].ext}
              </Button>}
            </div>
          </div>
        </div>

        {/* Sign-in nudge (optional now — conversion works either way) */}
        {!isAuthenticated && <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent/50 border border-accent">
            <LogIn className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Sign in to save your conversion history
            </span>
            <Button variant="outline" size="sm" onClick={startLogin} className="ml-2">
              Sign In
            </Button>
          </div>
        </div>}

        {/* Signed-in bar: history link + who's signed in + sign out */}
        {isAuthenticated && <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <a href="/history" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
            View your conversion history &rarr;
          </a>
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span>Signed in{user?.name ? ` as ${user.name}` : ""}</span>
            <button type="button" onClick={logout} className="text-primary hover:text-primary/80 font-medium underline underline-offset-2">
              Sign out
            </button>
          </div>
        </div>}
      </div>
    </section>

    {/* Footer */}
    <footer className="border-t border-border py-8">
      <div className="container text-center text-sm text-muted-foreground">
        <p>Built with Tesseract OCR &middot; python-docx &middot; python-pptx &middot; openpyxl &middot; WeasyPrint</p>
      </div>
    </footer>
  </div>;
}