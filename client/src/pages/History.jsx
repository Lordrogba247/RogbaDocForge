import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { FileText, FileSpreadsheet, Presentation, Download, Trash2, Clock, ArrowLeft, LogIn } from "lucide-react";
const formatIcons = {
  docx: <FileText className="w-4 h-4" />,
  pdf: <FileText className="w-4 h-4" />,
  pptx: <Presentation className="w-4 h-4" />,
  xlsx: <FileSpreadsheet className="w-4 h-4" />
};
const formatColors = {
  docx: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  pdf: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  pptx: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  xlsx: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
};
export default function History() {
  const {
    isAuthenticated
  } = useAuth();
  const historyQuery = trpc.conversion.getHistory.useQuery(undefined, {
    enabled: isAuthenticated
  });
  const utils = trpc.useUtils();
  const deleteMutation = trpc.conversion.deleteHistory.useMutation({
    onSuccess: () => {
      utils.conversion.getHistory.invalidate();
      toast.success("Deleted from history");
    },
    onError: err => {
      toast.error(err.message);
    }
  });
  if (!isAuthenticated) {
    return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <LogIn className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">Sign in to view history</h2>
        <p className="text-muted-foreground text-sm">Your conversion history is saved securely to your account.</p>
        <Button onClick={startLogin}>Sign In</Button>
      </div>;
  }
  return <div className="container py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <a href="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Conversion History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {historyQuery.data ? `${historyQuery.data.length} conversions` : "Loading..."}
          </p>
        </div>
      </div>

      {historyQuery.isLoading ? <div className="space-y-3">
          {Array.from({
        length: 5
      }).map((_, i) => <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />)}
        </div> : historyQuery.data && historyQuery.data.length === 0 ? <div className="text-center py-16">
          <Clock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No conversions yet</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Your conversion history will appear here.
          </p>
          <a href="/">
            <Button variant="outline">Start Converting</Button>
          </a>
        </div> : <div className="space-y-3">
          {historyQuery.data?.map(item => <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${formatColors[item.format] || "bg-gray-100 text-gray-700"}`}>
                {formatIcons[item.format] || <FileText className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{item.fileName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground uppercase font-medium px-2 py-0.5 rounded bg-muted">
                    .{item.format}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()}{" "}
                    {new Date(item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => {
            const a = document.createElement("a");
            a.href = item.fileUrl;
            a.download = item.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }} className="text-primary hover:text-primary hover:bg-primary/10">
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({
            id: item.id
          })} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>)}
        </div>}
    </div>;
}