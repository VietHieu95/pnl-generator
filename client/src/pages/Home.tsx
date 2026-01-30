import { useState, useRef, useCallback, useEffect } from "react";
import { PnlData } from "@shared/schema";
import { PnlCard } from "@/components/PnlCard";
import { PnlForm } from "@/components/PnlForm";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, Image, RotateCcw, Plus, X } from "lucide-react"; // Added Plus and X for UI
import { domToPng, domToBlob } from "modern-screenshot";
import { useToast } from "@/hooks/use-toast";

const defaultPnlData: PnlData = {
  id: Math.random().toString(36).substring(7), // Add a unique ID for each trade
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
  const [trades, setTrades] = useState<PnlData[]>(() => {
    const saved = localStorage.getItem("trades");
    const parsedTrades = saved ? JSON.parse(saved) : [defaultPnlData];
    // Ensure all trades have an ID, assign one if missing
    return parsedTrades.map((trade: PnlData) => ({
      ...trade,
      id: trade.id || Math.random().toString(36).substring(7),
    }));
  });

  const [activeId, setActiveId] = useState<string>(() => {
    const savedActiveId = localStorage.getItem("activeTradeId");
    const initialTrades = JSON.parse(localStorage.getItem("trades") || "[]");
    return savedActiveId || initialTrades[0]?.id || defaultPnlData.id!;
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isLive, setIsLive] = useState(() => {
    return localStorage.getItem("isLive") === "true";
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Derive the active trade
  const activeTrade = trades.find(t => t.id === activeId) || trades[0];

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("trades", JSON.stringify(trades));
    localStorage.setItem("activeTradeId", activeId);
    localStorage.setItem("isLive", isLive.toString());
  }, [trades, activeId, isLive]);

  // WebSocket for all unique symbols
  useEffect(() => {
    if (!isLive || trades.length === 0) return;

    const uniqueSymbols = Array.from(new Set(trades.map(t => t.symbol.toLowerCase())));
    if (uniqueSymbols.length === 0) return; // No symbols to subscribe to

    const streams = uniqueSymbols.map(s => `${s}@ticker`).join('/');
    const ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${streams}`);

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast({
        title: "Connection Error",
        description: "Check your internet or symbol names.",
        variant: "destructive",
      });
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.data && msg.data.e === '24hrTicker') {
        const symbol = msg.data.s;
        const price = parseFloat(msg.data.c);

        setTrades(prev => prev.map(t => {
          if (t.symbol.toUpperCase() === symbol.toUpperCase()) {
            return { ...t, markPrice: price };
          }
          return t;
        }));
      }
    };

    return () => ws.close();
  }, [isLive, JSON.stringify(trades.map(t => t.symbol)), toast]); // Re-run if isLive changes or symbols change

  // Automatic calculations for all trades
  useEffect(() => {
    const updatedTrades = trades.map(t => {
      // We only automate everything if we have entryPrice and size
      if (!t.entryPrice || !t.size) return t;

      // Use current markPrice (live) or if not live, it can still use the last markPrice value
      const currentPrice = t.markPrice || t.entryPrice;

      // Determine the actual position value based on unit
      // If unit is USDT, size is already the position value (Notional)
      // If unit is Coin (BTC, ETH, etc.), position value = entryPrice * size
      const isUnitUsdt = t.sizeUnit?.toUpperCase() === 'USDT';
      const positionValue = isUnitUsdt ? t.size : t.entryPrice * t.size;
      const sizeInCoin = isUnitUsdt ? t.size / t.entryPrice : t.size;

      const direction = t.positionType === 'Long' ? 1 : -1;
      const pnl = (currentPrice - t.entryPrice) * sizeInCoin * direction;
      const initialMargin = positionValue / (t.leverage || 1);
      const roi = (pnl / initialMargin) * 100;

      const maintenanceMargin = positionValue * 0.004; // Standard 0.4% MMR
      const marginBalance = t.walletBalance + pnl;
      const marginRatio = marginBalance <= 0 ? 100 : (maintenanceMargin / marginBalance) * 100;

      // Standard Binance Liquidation Price formula (simplified)
      const liqPrice = t.positionType === 'Long'
        ? t.entryPrice * (1 - (1 / t.leverage) + 0.004)
        : t.entryPrice * (1 + (1 / t.leverage) - 0.004);

      // Check if we need to update to avoid infinite loop
      // Compare with existing values, using 0 if undefined
      if (
        Math.abs(pnl - (t.unrealizedPnl || 0)) > 0.01 ||
        Math.abs(roi - (t.roi || 0)) > 0.01 ||
        Math.abs(initialMargin - (t.margin || 0)) > 0.01 ||
        Math.abs(marginRatio - (t.marginRatio || 0)) > 0.01 ||
        Math.abs(liqPrice - (t.liqPrice || 0)) > 0.01
      ) {
        return {
          ...t,
          unrealizedPnl: Number(pnl.toFixed(2)),
          roi: Number(roi.toFixed(2)),
          margin: Number(initialMargin.toFixed(2)),
          marginRatio: Number(Math.max(0, Math.min(marginRatio, 100)).toFixed(2)),
          liqPrice: Number(liqPrice.toFixed(2))
        };
      }
      return t;
    });

    // Only update state if any trade actually changed to prevent unnecessary re-renders
    // Deep comparison is needed here, but for simplicity, we'll check if the array reference changed
    // A more robust solution might involve a custom equality check or use-deep-compare-effect
    // For now, we'll rely on the fact that `map` creates new objects only if values change.
    // If no trade objects were modified, `updatedTrades` will contain the same objects as `trades`.
    // However, `setTrades` will still trigger a re-render if the array reference changes.
    // A simple JSON.stringify comparison can work for small, non-circular objects.
    if (JSON.stringify(updatedTrades) !== JSON.stringify(trades)) {
      setTrades(updatedTrades);
    }
  }, [
    trades, // Depend on the entire trades array to trigger recalculations
    // Specific properties that might change and affect calculations
    // (though `trades` dependency covers this, explicit listing can sometimes help clarity or specific optimizations)
  ]);

  const addTrade = () => {
    const newTrade = {
      ...defaultPnlData,
      id: Math.random().toString(36).substring(7),
      // Optionally, copy some values from the last trade or active trade
      symbol: trades[trades.length - 1]?.symbol || "BTCUSDT",
      walletBalance: activeTrade?.walletBalance || defaultPnlData.walletBalance,
    };
    setTrades([...trades, newTrade]);
    setActiveId(newTrade.id);
    toast({ title: "New Trade Added", description: "You now have a new trade slot." });
  };

  const deleteTrade = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tab activation
    if (trades.length === 1) {
      toast({ title: "Cannot Delete", description: "You must have at least one trade.", variant: "destructive" });
      return;
    }
    const newTrades = trades.filter(t => t.id !== id);
    setTrades(newTrades);
    if (activeId === id) {
      // If the active trade was deleted, set the first remaining trade as active
      setActiveId(newTrades[0].id!);
    }
    toast({ title: "Trade Deleted" });
  };

  const updateActiveTrade = (data: PnlData) => {
    setTrades(prev => prev.map(t => t.id === activeId ? data : t));
  };

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
      a.download = `pnl-${activeTrade?.symbol || 'trade'}-${Date.now()}.png`;
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
  }, [activeTrade, toast]);

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
    setTrades(prev => prev.map(t =>
      t.id === activeId
        ? { ...defaultPnlData, id: t.id, walletBalance: t.walletBalance } // Keep ID and walletBalance
        : t
    ));
    setIsLive(false);
    toast({
      title: "Reset complete",
      description: "Active trade values reset, but your Capital remains saved.",
    });
  }, [activeId, toast]);

  return (
    <div className="min-h-screen bg-background font-medium text-[17px]">
      <header className="border-b border-border bg-[#0B0E11]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-3 py-3 space-y-3">
          {/* Top Row: Logo & Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-sm bg-primary flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary-foreground">B</span>
              </div>
              <h1 className="text-sm font-bold text-foreground tracking-tight hidden xs:block">PNL PRO</h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2 bg-secondary/30 px-2 py-1 rounded-full border border-border/50">
                <Switch
                  id="live-mode"
                  checked={isLive}
                  onCheckedChange={setIsLive}
                  className="scale-75"
                />
                <Label htmlFor="live-mode" className="cursor-pointer text-[10px] font-black uppercase tracking-tighter">
                  {isLive ? 'ACTIVE' : 'DRAFT'}
                </Label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-7 px-2 text-[10px] uppercase font-bold text-muted-foreground hover:bg-destructive/10"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>
          </div>

          {/* Bottom Row: Trade Selection (Scrollable) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
            {trades.map((t, idx) => (
              <div
                key={t.id}
                onClick={() => setActiveId(t.id!)}
                className={`relative group flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[11px] font-bold uppercase transition-all whitespace-nowrap overflow-hidden ${activeId === t.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(243,186,47,0.2)]'
                    : 'bg-secondary/10 border-border/40 text-muted-foreground hover:border-border'
                  }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeId === t.id ? 'bg-primary-foreground' : 'bg-muted-foreground/30'}`} />
                {t.symbol}
                <button
                  onClick={(e) => deleteTrade(t.id!, e)}
                  className={`ml-1 hover:bg-black/20 rounded-full p-0.5 transition-colors ${activeId === t.id ? 'opacity-100' : 'opacity-0 stroke-1 group-hover:opacity-100'}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            <Button
              onClick={addTrade}
              variant="outline"
              size="sm"
              className="rounded-md h-7 w-7 p-0 shrink-0 border-dashed bg-transparent border-border/50"
            >
              <Plus className="w-3.5 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <PnlForm data={activeTrade} onChange={updateActiveTrade} isLive={isLive} />
          </div>

          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Performance Card</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyToClipboard} disabled={isExporting}>
                  <Image className="w-4 h-4 mr-1.5" />
                  Copy
                </Button>
                <Button size="sm" onClick={handleExport} disabled={isExporting}>
                  <Download className="w-4 h-4 mr-1.5" />
                  {isExporting ? "Exporting..." : "Download"}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center p-6 bg-[#0B0E11] rounded-2xl border border-border shadow-2xl">
                <div ref={cardRef} className="shrink-0">
                  <PnlCard data={activeTrade} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="opacity-40 hover:opacity-100 transition-opacity">
                  <p className="text-[10px] font-bold uppercase text-center mb-2">Ref Short</p>
                  <img src="/ref/IMG_0244_1769433702851.JPG" className="rounded-xl border border-border" />
                </div>
                <div className="opacity-40 hover:opacity-100 transition-opacity">
                  <p className="text-[10px] font-bold uppercase text-center mb-2">Ref Long</p>
                  <img src="/ref/IMG_5589_1769433702855.JPG" className="rounded-xl border border-border" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
