import { useState, useRef, useCallback, useEffect } from "react";
import { PnlData } from "@shared/schema";
import { PnlCard } from "@/components/PnlCard";
import { PnlForm } from "@/components/PnlForm";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, Image, RotateCcw } from "lucide-react";
import { domToPng, domToBlob } from "modern-screenshot";
import { useToast } from "@/hooks/use-toast";

const defaultPnlData: PnlData = {
  symbol: "BTCUSDT",
  type: "Perp",
  marginMode: "Cross",
  leverage: 20,
  positionType: "Long",
  signalBars: 4,
  unrealizedPnl: -1381.63,
  roi: -41.03,
  size: 0.768,
  sizeUnit: "BTC",
  margin: 3367.29,
  marginRatio: 5.17,
  entryPrice: 89493.20,
  markPrice: 87689.94,
  liqPrice: 80812.02,
  walletBalance: 10000,
  tpPrice: "--",
  slPrice: "--",
};

export default function Home() {
  const [pnlData, setPnlData] = useState<PnlData>(() => {
    const saved = localStorage.getItem("pnlData");
    return saved ? JSON.parse(saved) : defaultPnlData;
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isLive, setIsLive] = useState(() => {
    return localStorage.getItem("isLive") === "true";
  });
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("pnlData", JSON.stringify(pnlData));
    localStorage.setItem("isLive", isLive.toString());
  }, [pnlData, isLive]);

  useEffect(() => {
    if (!isLive) return;

    const symbol = pnlData.symbol.toLowerCase();
    const ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol}@ticker`);

    ws.onopen = () => {
      toast({
        title: "Live Data Connected",
        description: `Streaming ${pnlData.symbol} prices from Binance...`,
      });
    };

    ws.onerror = () => {
      toast({
        title: "Connection Failed",
        description: `Could not find ${pnlData.symbol} on Binance Futures. Check the symbol name.`,
        variant: "destructive",
      });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.e === '24hrTicker') {
        const price = parseFloat(data.c); // 'c' is the Last Price
        setPnlData(prev => ({
          ...prev,
          markPrice: price
        }));
      }
    };

    return () => {
      ws.close();
    };
  }, [isLive, pnlData.symbol, toast]);

  // Handle instant updates and automatic calculations
  useEffect(() => {
    // We only automate everything if we have entryPrice and size
    if (!pnlData.entryPrice || !pnlData.size) return;

    // Use current markPrice (live) or if not live, it can still use the last markPrice value
    const currentPrice = pnlData.markPrice || pnlData.entryPrice;

    // Determine the actual position value based on unit
    // If unit is USDT, size is already the position value (Notional)
    // If unit is Coin (BTC, ETH, etc.), position value = entryPrice * size
    const isUnitUsdt = pnlData.sizeUnit?.toUpperCase() === 'USDT';
    const positionValue = isUnitUsdt ? pnlData.size : pnlData.entryPrice * pnlData.size;
    const sizeInCoin = isUnitUsdt ? pnlData.size / pnlData.entryPrice : pnlData.size;

    const direction = pnlData.positionType === 'Long' ? 1 : -1;
    const pnl = (currentPrice - pnlData.entryPrice) * sizeInCoin * direction;
    const initialMargin = positionValue / (pnlData.leverage || 1);
    const roi = (pnl / initialMargin) * 100;

    const maintenanceMargin = positionValue * 0.004; // Standard 0.4% MMR
    const marginBalance = pnlData.walletBalance + pnl;
    const marginRatio = marginBalance <= 0 ? 100 : (maintenanceMargin / marginBalance) * 100;

    // Standard Binance Liquidation Price formula (simplified)
    const liqPrice = pnlData.positionType === 'Long'
      ? pnlData.entryPrice * (1 - (1 / pnlData.leverage) + 0.004)
      : pnlData.entryPrice * (1 + (1 / pnlData.leverage) - 0.004);

    // Update state if any calculated value differs significantly
    const shouldUpdate =
      Math.abs(pnl - pnlData.unrealizedPnl) > 0.01 ||
      Math.abs(roi - pnlData.roi) > 0.01 ||
      Math.abs(initialMargin - pnlData.margin) > 0.01 ||
      Math.abs(marginRatio - pnlData.marginRatio) > 0.01 ||
      Math.abs(liqPrice - pnlData.liqPrice) > 0.01;

    if (shouldUpdate) {
      setPnlData(prev => ({
        ...prev,
        unrealizedPnl: Number(pnl.toFixed(2)),
        roi: Number(roi.toFixed(2)),
        margin: Number(initialMargin.toFixed(2)),
        marginRatio: Number(Math.max(0, Math.min(marginRatio, 100)).toFixed(2)),
        liqPrice: Number(liqPrice.toFixed(2))
      }));
    }
  }, [
    isLive,
    pnlData.markPrice,
    pnlData.entryPrice,
    pnlData.size,
    pnlData.sizeUnit,
    pnlData.positionType,
    pnlData.leverage,
    pnlData.walletBalance
  ]);

  const handleExport = useCallback(async () => {
    if (!cardRef.current) return;

    setIsExporting(true);
    try {
      const dataUrl = await domToPng(cardRef.current, {
        scale: 4,
        backgroundColor: "#202630",
        width: 480,
        height: 280,
        fetch: {
          requestInit: {
            mode: 'cors',
          },
        },
        font: {
          preferredFormat: 'woff2',
        },
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `pnl-${pnlData.symbol}-${Date.now()}.png`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);

      toast({
        title: "Image downloaded!",
        description: "Your PNL image has been saved.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Export error:", errorMessage, error);
      toast({
        title: "Export failed",
        description: errorMessage || "Could not export the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [pnlData.symbol, toast]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!cardRef.current) return;

    setIsExporting(true);
    try {
      const blob = await domToBlob(cardRef.current, {
        scale: 4,
        backgroundColor: "#202630",
        width: 480,
        height: 280,
        fetch: {
          requestInit: {
            mode: 'cors',
          },
        },
        font: {
          preferredFormat: 'woff2',
        },
      });

      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        toast({
          title: "Copied to clipboard!",
          description: "You can now paste the image anywhere.",
        });
      }
    } catch (error) {
      console.error("Copy error:", error);
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Try downloading instead.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [toast]);

  const handleReset = useCallback(() => {
    setPnlData(defaultPnlData);
    setIsLive(false);
    toast({
      title: "Reset complete",
      description: "All values have been reset to defaults.",
    });
  }, [toast]);

  return (
    <div className="min-h-screen bg-background font-medium text-[17px]">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">B</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">PNL Generator</h1>
              <p className="text-xs text-muted-foreground">Create trading PNL images</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2 bg-secondary/30 px-3 py-1.5 rounded-full border border-border">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
              <Switch
                id="live-mode"
                checked={isLive}
                onCheckedChange={setIsLive}
              />
              <Label htmlFor="live-mode" className="cursor-pointer text-sm font-semibold">
                {isLive ? 'ACTIVE TRADE' : 'DRAFT MODE'}
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              data-testid="button-reset"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Reset
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <PnlForm data={pnlData} onChange={setPnlData} isLive={isLive} />
          </div>

          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Preview</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToClipboard}
                  disabled={isExporting}
                  data-testid="button-copy"
                >
                  <Image className="w-4 h-4 mr-1.5" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  onClick={handleExport}
                  disabled={isExporting}
                  data-testid="button-download"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  {isExporting ? "Exporting..." : "Download"}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2 text-center">Your PNL</p>
                <div className="flex justify-center p-4 bg-[#0B0E11] rounded-lg border border-border overflow-x-auto">
                  <div ref={cardRef} className="shrink-0">
                    <PnlCard data={pnlData} />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2 text-center">Reference (Short)</p>
                <img
                  src="/ref/IMG_0244_1769433702851.JPG"
                  alt="Reference Short"
                  className="rounded-lg border border-border w-full max-w-[480px] mx-auto block"
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2 text-center">Reference (Long)</p>
                <img
                  src="/ref/IMG_5589_1769433702855.JPG"
                  alt="Reference Long"
                  className="rounded-lg border border-border w-full max-w-[480px] mx-auto block"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
