import { useState, useRef, useCallback, useEffect } from "react";
import { PnlData } from "@shared/schema";
import { PnlCard } from "@/components/PnlCard";
import { PnlForm } from "@/components/PnlForm";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, Image, RotateCcw, Plus, X, Activity } from "lucide-react"; // Changed CloudSync to Activity
import { domToPng, domToBlob } from "modern-screenshot";
import { useToast } from "@/hooks/use-toast";
import { calculatePnlValues } from "@shared/calculations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const defaultPnlData: PnlData = {
  id: Math.random().toString(36).substring(7),
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Sync with Server for AI Agent features
  const { data: serverPnl, isLoading: isServerLoading } = useQuery<PnlData>({
    queryKey: ["/api/pnl"],
    refetchInterval: 5000, // Optional: auto-refresh every 5 seconds to see AI updates
  });

  const updateServerPnl = useMutation({
    mutationFn: async (data: Partial<PnlData>) => {
      const res = await apiRequest("POST", "/api/pnl", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/pnl"], data);
    },
  });

  const [trades, setTrades] = useState<PnlData[]>(() => {
    const saved = localStorage.getItem("trades");
    const parsedTrades = saved ? JSON.parse(saved) : [defaultPnlData];
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

  // Derive the active trade
  const activeTrade = trades.find(t => t.id === activeId) || trades[0];

  // Sync server data to local active trade if it's newer or if user wants it
  useEffect(() => {
    if (serverPnl) {
      // For now, let's just make the server data available as a special "AI Trade" or update active
      // Setting active trade to what's on server if it was changed by AI
      setTrades(prev => prev.map(t => {
        if (t.id === activeId) {
          // Compare certain fields to see if server has priority (e.g. AI updated it)
          // For simplicity, we can add a manual "Sync" button or auto-sync
          return { ...t, ...serverPnl, id: t.id };
        }
        return t;
      }));
    }
  }, [serverPnl, activeId]);

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
    if (uniqueSymbols.length === 0) return;

    const streams = uniqueSymbols.map(s => `${s}@ticker`).join('/');
    const ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${streams}`);

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
  }, [isLive, JSON.stringify(trades.map(t => t.symbol)), toast]);

  // Automatic calculations for all trades using shared utility
  useEffect(() => {
    const updatedTrades = trades.map(t => {
      const calculated = calculatePnlValues(t);

      // Check if we need to update to avoid infinite loop
      if (
        Math.abs((calculated.unrealizedPnl || 0) - (t.unrealizedPnl || 0)) > 0.01 ||
        Math.abs((calculated.roi || 0) - (t.roi || 0)) > 0.01 ||
        Math.abs((calculated.margin || 0) - (t.margin || 0)) > 0.01 ||
        Math.abs((calculated.marginRatio || 0) - (t.marginRatio || 0)) > 0.01 ||
        Math.abs((calculated.liqPrice || 0) - (t.liqPrice || 0)) > 0.01
      ) {
        return { ...t, ...calculated };
      }
      return t;
    });

    if (JSON.stringify(updatedTrades) !== JSON.stringify(trades)) {
      setTrades(updatedTrades);
    }
  }, [trades]);

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
    // Sync to server for AI Agent
    updateServerPnl.mutate(data);
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
    <div className="min-h-screen w-screen overflow-x-hidden bg-[#0B0E11] font-medium border-t-2 border-primary/20">
      <header className="w-full border-b border-white/5 bg-[#0B0E11]/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto px-3 py-2.5">
          {/* Top Row: Brand & Mode */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(243,186,47,0.3)]">
                <span className="text-[10px] font-black text-primary-foreground italic">B</span>
              </div>
              <h1 className="text-xs font-black text-foreground tracking-tighter uppercase">PNL PRO</h1>
              {serverPnl && (
                <div className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                  <Activity className="w-3 h-3 text-blue-400 animate-pulse" />
                  <span className="text-[8px] font-bold text-blue-400 uppercase tracking-tighter">AI Agent Connected</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-1.5 bg-white/5 px-2 py-1 rounded-full border border-white/10">
                <Switch
                  id="live-mode"
                  checked={isLive}
                  onCheckedChange={setIsLive}
                  className="scale-[0.6] data-[state=checked]:bg-primary"
                />
                <span className={`text-[9px] font-black uppercase tracking-tighter ${isLive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {isLive ? 'LIVE' : 'DRAFT'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-7 w-7 p-0 text-muted-foreground hover:bg-white/5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Tabs Row */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth px-1">
            {trades.map((t) => (
              <div
                key={t.id}
                onClick={() => setActiveId(t.id!)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all whitespace-nowrap ${activeId === t.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                  : 'bg-white/5 border-white/5 text-muted-foreground'
                  }`}
              >
                <span>{t.symbol}</span>
                <button
                  onClick={(e) => deleteTrade(t.id!, e)}
                  className="ml-1 hover:bg-black/20 rounded-full p-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            <Button
              onClick={addTrade}
              variant="outline"
              size="sm"
              className="rounded-lg h-7 w-7 p-0 shrink-0 border-white/10 bg-white/5"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-3 py-4 md:py-8">
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <div className="w-full min-w-0">
            <PnlForm data={activeTrade} onChange={updateActiveTrade} isLive={isLive} />
          </div>

          <div className="lg:sticky lg:top-24 space-y-5 w-full min-w-0">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Live Preview</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyToClipboard} className="h-8 text-[10px] uppercase px-3 border-white/10 bg-white/5">
                  <Image className="w-3 h-3 mr-1.5" />
                  Copy
                </Button>
                <Button size="sm" onClick={handleExport} className="h-8 text-[10px] uppercase px-3">
                  <Download className="w-3 h-3 mr-1.5" />
                  {isExporting ? "..." : "Export"}
                </Button>
              </div>
            </div>

            <div className="space-y-6 w-full min-w-0">
              {/* Scrollable container for card preview */}
              <div className="w-full max-h-[70vh] overflow-y-auto overflow-x-hidden p-3 bg-gradient-to-b from-[#1E2329] to-[#0B0E11] rounded-[1.5rem] border border-white/5 shadow-2xl">
                {/* 
                  Scale wrapper: Reduced to 0.75 for better mobile fit
                  Allows entire card to be visible on smaller screens
                */}
                <div className="w-full flex justify-center">
                  <div
                    className="origin-top"
                    style={{
                      transform: 'scale(0.75)',
                      transformOrigin: 'top center'
                    }}
                  >
                    {/* 
                      Ref is now on an UNSCALED inner div.
                      This prevents modern-screenshot from capturing the whitespace 
                      caused by the parent's scale transform.
                    */}
                    <div ref={cardRef} className="shrink-0">
                      <PnlCard data={activeTrade} />
                    </div>
                  </div>
                </div>
              </div>




              <div className="grid grid-cols-2 gap-3 opacity-40 w-full min-w-0">
                <div className="space-y-1 min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-widest text-center text-muted-foreground">Ref Short</p>
                  <img src="/ref/IMG_0244_1769433702851.JPG" className="rounded-xl border border-white/5 w-full" alt="Short reference" />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-widest text-center text-muted-foreground">Ref Long</p>
                  <img src="/ref/IMG_5589_1769433702855.JPG" className="rounded-xl border border-white/5 w-full" alt="Long reference" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
