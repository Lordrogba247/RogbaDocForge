import { useState, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import SmartFormatPanel from "@/components/SmartFormatPanel";
import UploadZone from "@/components/UploadZone";
import LivePreview from "@/components/LivePreview";
import BatchPanel from "@/components/BatchPanel";
import AIPanel from "@/components/AIPanel";
import BrandKitPanel from "@/components/BrandKitPanel";
import WorkspacePanels from "@/components/WorkspacePanels";
import ImagePanel from "@/components/ImagePanel";
import { useLanguage, LanguagePanel, OfflinePanel, SharePanel } from "@/components/LocaleShare";
import { FileText, FileSpreadsheet, Presentation, ImageIcon, Upload, X, Sparkles, Loader2, ArrowDownToLine, LogIn, Code2, Braces } from "lucide-react";
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
  },
  html: {
    label: "HTML",
    icon: <Code2 className="w-5 h-5" />,
    color: "bg-violet-50 border-violet-200 text-violet-700 hover:border-violet-400 hover:bg-violet-100",
    darkColor: "dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300 dark:hover:border-violet-600 dark:hover:bg-violet-900/40",
    ext: "html"
  },
  md: {
    label: "Markdown",
    icon: <Braces className="w-5 h-5" />,
    color: "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-100",
    darkColor: "dark:bg-slate-950/40 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-900/40",
    ext: "md"
  }
};
export default function Home() {
  const [text, setText] = useState(() => {
    try { return localStorage.getItem("rdf_offline_text") || ""; } catch { return ""; }
  });
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [isConverting, setIsConverting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [downloadFileName, setDownloadFileName] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedImageName, setUploadedImageName] = useState(null);
  const [smartOptions, setSmartOptions] = useState({
    template: "blank",
    academic: "none",
    theme: "modern",
    font: "",
    fontSize: 11,
    lineSpacing: 1.15,
    align: "left",
    autoHeadings: true,
    toc: false,
    cover: false,
    coverName: "",
    coverDate: "",
    coverStyle: "modern",
    header: "",
    footer: "",
    pageNumbers: true,
    differentFirstPage: true,
    watermark: "",
    signatureName: "",
    signatureTitle: "",
    brandAccent: "",
    images: [],
  });
  const { lang, setLang } = useLanguage();
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
        title: text.trim().split("\n")[0].substring(0, 80) || "Document",
        options: smartOptions,
      });
      setDownloadUrl(result.url);
      setDownloadFileName(result.fileName);
      toast.success(`${formatConfig[selectedFormat].label} file generated!`);
    } catch (err) {
      toast.error(err.message || "Conversion failed. Please try again.");
    } finally {
      setIsConverting(false);
    }
  }, [text, selectedFormat, smartOptions, convertMutation]);
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
          <span className="rgdx-hero-badge">✨ Free • No sign-up needed to try but sign in to view your history</span>
          <h1 className="font-display text-4xl lg:text-6xl font-bold tracking-tight text-foreground mt-4 mb-4">
            Turn rough text into polished documents
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            <strong className="text-foreground">RogbaDox</strong> cleans up your writing, applies beautiful
            formatting, and exports it as <strong className="text-foreground">Word, PDF, PowerPoint, Excel, HTML or Markdown</strong> —
            perfect for letters, CVs, reports, theses, invoices and more.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
            <a href="#start" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
              <Sparkles className="w-4 h-4" /> Start formatting — it's free
            </a>
            <a href="#how-it-works" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border bg-card font-semibold text-sm text-foreground hover:bg-accent/50 transition-colors">
              See how it works
            </a>
          </div>
        </div>
        {/* How it works — plain-language 3 steps */}
        <div id="how-it-works" className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto mt-10 scroll-mt-24">
          <div className="rgdx-step-card">
            <div className="rgdx-step-num">1</div>
            <h3 className="font-display font-semibold text-foreground mb-1">Add your content</h3>
            <p className="text-sm text-muted-foreground">Type, paste, upload a file (.txt, .docx, .pdf…), or extract text from a photo.</p>
          </div>
          <div className="rgdx-step-card">
            <div className="rgdx-step-num">2</div>
            <h3 className="font-display font-semibold text-foreground mb-1">Polish it</h3>
            <p className="text-sm text-muted-foreground">Pick a template (CV, letter, report…), fix headings, or let AI improve your writing.</p>
          </div>
          <div className="rgdx-step-card">
            <div className="rgdx-step-num">3</div>
            <h3 className="font-display font-semibold text-foreground mb-1">Download &amp; share</h3>
            <p className="text-sm text-muted-foreground">Export as Word or PDF, preview the result, then download or share via WhatsApp or email.</p>
          </div>
        </div>
      </div>
    </section>

    {/* Main Converter */}
    <section id="start" className="container pb-20 -mt-4 scroll-mt-20">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-2xl border border-border shadow-lg shadow-primary/5 overflow-hidden">
          {/* Format Selector */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-sm font-semibold text-foreground uppercase tracking-wider">
                Step 1 — Choose your file type
              </h2>
              <LanguagePanel lang={lang} setLang={setLang} />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              What do you want to download? Pick <strong className="text-foreground">Word</strong> for editing, <strong className="text-foreground">PDF</strong> for sharing or printing.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
            <UploadZone onTextLoaded={(t, name) => { setText(t); setDownloadUrl(null); }} />
            {/* Image Upload Zone */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Step 2 — Add your content
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Upload a photo of handwritten or printed text and RogbaDox will read it for you (OCR).
              </p>
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
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Or type / paste your text
                </h3>
                <span className="text-xs text-muted-foreground">
                  {text.length} characters
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Don't worry about messy formatting — RogbaDox fixes headings, spacing and lists automatically in the next step.
              </p>
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

            <SmartFormatPanel text={text} setText={setText} options={smartOptions} setOptions={setSmartOptions} />

            <AIPanel text={text} setText={setText} />

            <OfflinePanel text={text} />

            <BrandKitPanel options={smartOptions} setOptions={setSmartOptions} />

            <ImagePanel options={smartOptions} setOptions={setSmartOptions} />

            <WorkspacePanels text={text} setText={setText} options={smartOptions} setOptions={setSmartOptions} />

            {/* Action Buttons */}
            <div className="pt-2">
              <h3 className="font-display text-sm font-semibold text-foreground uppercase tracking-wider mb-2">
                Step 4 — Get your polished file
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Click the big button, wait a few seconds, then download. Your formatting choices above are applied automatically.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button onClick={handleConvert} disabled={isConverting || !text.trim()} className="flex-1 h-12 text-base font-semibold gap-2 bg-primary hover:bg-primary/90">
                  {isConverting ? <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Making your file...
                  </> : <>
                    <Sparkles className="w-5 h-5" />
                    Make my {(formatConfig[selectedFormat] || {}).label || selectedFormat} file
                  </>}
                </Button>

                {downloadUrl && <Button onClick={handleDownload} variant="outline" className="flex-1 h-12 text-base font-semibold gap-2 border-2 border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
                  <ArrowDownToLine className="w-5 h-5" />
                  Download your file
                </Button>}
              </div>
            </div>

            <LivePreview text={text} options={{ ...smartOptions, rtl: lang === "ar" }} title={text.trim().split("\n")[0].substring(0, 80) || "Preview"} />

            <BatchPanel format={selectedFormat} options={smartOptions} />

            <SharePanel downloadUrl={downloadUrl} downloadFileName={downloadFileName} text={text} />
          </div>

          {/* Sign-in nudge (optional now — conversion works either way) */}
          {!isAuthenticated && <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent/50 border border-accent">
              <LogIn className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Want to keep your files? Sign in — it's free
              </span>
              <Button variant="outline" size="sm" onClick={startLogin} className="ml-2">
                Sign In
              </Button>
            </div>
          </div>}

          {/* Signed-in bar: history link + who's signed in + sign out */}
          {isAuthenticated && <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <a href="/history" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
              See all my files &rarr;
            </a>
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <span>Signed in{user?.name ? ` as ${user.name}` : ""}</span>
              <button type="button" onClick={logout} className="text-primary hover:text-primary/80 font-medium underline underline-offset-2">
                Sign out
              </button>
            </div>
          </div>}
        </div>
      </div>
    </section>

    {/* Footer */}
    <footer className="border-t border-border py-8">
      <div className="container text-center text-sm text-muted-foreground space-y-1">
        <p className="font-display font-semibold text-foreground">RogbaDox <span className="font-normal text-muted-foreground">by Aderogba</span></p>
        <p>Aderogba &copy; 2026 - All rights reserved</p>
      </div>
    </footer>
  </div>;
}