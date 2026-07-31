import { useCallback, useState, RefObject } from "react";
import { PnlData } from "@shared/schema";
import { domToBlob } from "modern-screenshot";
import { useToast } from "@/hooks/use-toast";

const SCREENSHOT_OPTIONS = {
  scale: 4,
  backgroundColor: "#202630",
  width: 480,
  height: 280,
  fetch: { requestInit: { mode: "cors" as const } },
  font: { preferredFormat: "woff2" as const },
};

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/**
 * Provides handleExport (download) and handleCopyToClipboard helpers.
 * Accepts a ref to the card DOM element and the active trade for filename.
 *
 * iOS Safari ignores `<a download>`, so exporting there goes through the share
 * sheet instead. If neither the share sheet nor the clipboard is available
 * (both need a secure context), we fall back to `savePreviewUrl`: the caller
 * shows the PNG full-screen and the user long-presses it to "Add to Photos".
 */
export function useTradeExport(
  cardRef: RefObject<HTMLDivElement>,
  activeTrade: PnlData | undefined,
  cardLanguage: "en" | "zh" = "en"
) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [savePreviewUrl, setSavePreviewUrl] = useState<string | null>(null);

  const showSavePreview = useCallback((url: string) => {
    setSavePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  const closeSavePreview = useCallback(() => {
    setSavePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const renderBlob = useCallback(async () => {
    const blob = await domToBlob(cardRef.current!, SCREENSHOT_OPTIONS);
    if (!blob) throw new Error("Failed to generate image.");
    return blob;
  }, [cardRef]);

  const handleExport = useCallback(async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const blob = await renderBlob();
      const filename = `pnl-${activeTrade?.symbol || "trade"}-${cardLanguage}-${Date.now()}.png`;

      // Native share sheet: the only real "Save Image" path on iOS. Needs HTTPS.
      if (navigator.canShare && navigator.share) {
        const file = new File([blob], filename, { type: blob.type || "image/png" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file] });
            return;
          } catch (err) {
            // User dismissed the sheet — nothing went wrong.
            if ((err as { name?: string })?.name === "AbortError") return;
          }
        }
      }

      const url = URL.createObjectURL(blob);

      if (isIOS()) {
        showSavePreview(url);
        toast({
          title: "Nhấn giữ ảnh để lưu",
          description: 'Chọn "Add to Photos" / "Lưu vào Ảnh".',
        });
        return;
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
      toast({ title: "Image downloaded!", description: "Your PNL image has been saved." });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({ title: "Export failed", description: msg, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }, [cardRef, renderBlob, activeTrade?.symbol, cardLanguage, showSavePreview, toast]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const blob = await renderBlob();

      if (navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        toast({ title: "Copied to clipboard!", description: "Paste it anywhere." });
        return;
      }

      // No clipboard API — show the image so it can be long-pressed instead of
      // dead-ending on a "Not Supported" error.
      showSavePreview(URL.createObjectURL(blob));
      toast({
        title: "Nhấn giữ ảnh để copy",
        description: 'Chọn "Copy" hoặc "Lưu vào Ảnh".',
      });
    } catch (error: any) {
      let msg = "Could not copy to clipboard.";
      if (error?.name === "NotAllowedError") msg = "Permission denied. Allow clipboard access.";
      else if (error?.message) msg = error.message;
      toast({
        title: "Copy failed",
        description: msg + " Try downloading instead.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [cardRef, renderBlob, showSavePreview, toast]);

  return {
    isExporting,
    handleExport,
    handleCopyToClipboard,
    savePreviewUrl,
    closeSavePreview,
  };
}
