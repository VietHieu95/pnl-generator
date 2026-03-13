import { useCallback, useState, RefObject } from "react";
import { PnlData } from "@shared/schema";
import { domToPng, domToBlob } from "modern-screenshot";
import { useToast } from "@/hooks/use-toast";

const SCREENSHOT_OPTIONS = {
  scale: 4,
  backgroundColor: "#202630",
  width: 480,
  height: 280,
  fetch: { requestInit: { mode: "cors" as const } },
  font: { preferredFormat: "woff2" as const },
};

/**
 * Provides handleExport (download) and handleCopyToClipboard helpers.
 * Accepts a ref to the card DOM element and the active trade for filename.
 */
export function useTradeExport(
  cardRef: RefObject<HTMLDivElement>,
  activeTrade: PnlData | undefined
) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await domToPng(cardRef.current, SCREENSHOT_OPTIONS);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `pnl-${activeTrade?.symbol || "trade"}-${Date.now()}.png`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 100);
      toast({ title: "Image downloaded!", description: "Your PNL image has been saved." });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({ title: "Export failed", description: msg, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }, [cardRef, activeTrade?.symbol, toast]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!cardRef.current) return;
    if (!navigator.clipboard?.write) {
      toast({
        title: "Not Supported",
        description: "Your browser does not support copying images. Use Download instead.",
        variant: "destructive",
      });
      return;
    }
    setIsExporting(true);
    try {
      const blob = await domToBlob(cardRef.current, SCREENSHOT_OPTIONS);
      if (!blob) throw new Error("Failed to generate image.");
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast({ title: "Copied to clipboard!", description: "Paste it anywhere." });
    } catch (error: any) {
      let msg = "Could not copy to clipboard.";
      if (error.name === "NotAllowedError") msg = "Permission denied. Allow clipboard access.";
      else if (error.message) msg = error.message;
      toast({ title: "Copy failed", description: msg + " Try downloading instead.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }, [cardRef, toast]);

  return { isExporting, handleExport, handleCopyToClipboard };
}
