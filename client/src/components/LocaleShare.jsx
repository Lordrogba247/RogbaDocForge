import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getStrings, isRTL } from "@shared/i18n.js";
import { Languages, Share2, WifiOff, Mail, MessageCircle } from "lucide-react";

export function useLanguage() {
  const [lang, setLang] = useState(() => localStorage.getItem("rdf_lang") || "en");
  useEffect(() => {
    localStorage.setItem("rdf_lang", lang);
    document.documentElement.lang = lang === "ar" ? "ar" : "en";
    document.documentElement.dir = isRTL(lang) ? "rtl" : "ltr";
  }, [lang]);
  return { lang, setLang, t: getStrings(lang) };
}

export function LanguagePanel({ lang, setLang }) {
  return (
    <div className="flex items-center gap-2">
      <Languages className="w-4 h-4 text-muted-foreground" />
      <Select value={lang} onValueChange={setLang}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="yo">Yoruba</SelectItem>
          <SelectItem value="ha">Hausa</SelectItem>
          <SelectItem value="ar">Arabic (RTL)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function OfflinePanel({ text }) {
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => {
      setOnline(false);
      try { localStorage.setItem("rdf_offline_text", text || ""); } catch {}
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [text]);
  useEffect(() => {
    try { localStorage.setItem("rdf_offline_text", text || ""); } catch {}
  }, [text]);
  if (online) return null;
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm flex items-center gap-2">
      <WifiOff className="w-4 h-4" /> You're offline — your text is saved on this device. Reconnect, then try again.
    </div>
  );
}

export function SharePanel({ downloadUrl, downloadFileName, text }) {
  const [email, setEmail] = useState("");
  const shareText = (text || "").slice(0, 1000);
  const waUrl = "https://wa.me/?text=" + encodeURIComponent((downloadFileName || "Document") + "\n" + shareText.slice(0, 500) + (downloadUrl ? "\n" + downloadUrl : ""));
  const mailUrl = "mailto:" + encodeURIComponent(email) + "?subject=" + encodeURIComponent(downloadFileName || "Document") + "&body=" + encodeURIComponent(shareText.slice(0, 800) + (downloadUrl ? "\n\nDownload: " + downloadUrl : ""));
  const nativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: downloadFileName || "Document", text: shareText.slice(0, 300), url: downloadUrl || undefined });
      } else {
        await navigator.clipboard.writeText(downloadUrl || shareText);
        toast.success("Link/text copied");
      }
    } catch {}
  };
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Share2 className="w-4 h-4" /> Send or share your file
      </h3>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={nativeShare}><Share2 className="w-3 h-3 mr-1" />Share / Copy link</Button>
        <Button size="sm" variant="outline" onClick={() => window.open(waUrl, "_blank", "noopener")}>
          <MessageCircle className="w-3 h-3 mr-1" />WhatsApp
        </Button>
        <div className="flex gap-2 items-center">
          <Input placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-48" />
          <Button size="sm" variant="outline" onClick={() => { window.location.href = mailUrl; }}>
            <Mail className="w-3 h-3 mr-1" />Email
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">WhatsApp/Email share the download link + text excerpt. For private files, download first then attach.</p>
    </div>
  );
}
