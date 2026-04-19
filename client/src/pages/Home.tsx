import { useRef } from "react";
import { PnlCard } from "@/components/PnlCard";
import { PnlForm } from "@/components/PnlForm";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, Image, RotateCcw, Plus, X, Activity } from "lucide-react";
import { useTradesState } from "@/hooks/useTradesState";
import { useTradeExport } from "@/hooks/useTradeExport";
import { useBinanceTicker } from "@/hooks/useBinanceTicker";
import { HotCoins } from "@/components/HotCoins";

export default function Home() {
  const {
    trades,
    activeId,
    setActiveId,
    isLive,
    setIsLive,
    activeTrade,
    serverPnl,
    addTrade,
    deleteTrade,
    updateActiveTrade,
    updateTradePrice,
    resetActiveTrade,
    generateAutoWin,
    scalpHotCoin,
  } = useTradesState();

  const cardRef = useRef<HTMLDivElement>(null);
  const { isExporting, handleExport, handleCopyToClipboard } = useTradeExport(
    cardRef,
    activeTrade
  );

  // Stable WebSocket subscription — only reconnects when symbols change
  useBinanceTicker(trades, isLive, updateTradePrice);

  return (
    <div className="min-h-[100dvh] w-full bg-[#0B0E11] font-medium border-t-2 border-primary/20">
      <header className="w-full border-b border-white/5 bg-[#0B0E11]/95 backdrop-blur-xl sticky top-0 z-50"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
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
                <span className={`text-[9px] font-black uppercase tracking-tighter ${isLive ? "text-primary" : "text-muted-foreground"}`}>
                  {isLive ? "LIVE" : "DRAFT"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetActiveTrade}
                className="h-7 w-7 p-0 text-muted-foreground hover:bg-white/5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Trade Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth px-1">
            {trades.map((t) => (
              <div
                key={t.id}
                onClick={() => setActiveId(t.id!)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                  activeId === t.id
                    ? "bg-primary text-primary-foreground border-primary shadow-lg"
                    : "bg-white/5 border-white/5 text-muted-foreground"
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
          <div className="w-full min-w-0 space-y-4">
            <HotCoins onSelect={scalpHotCoin} />
            <PnlForm 
              data={activeTrade} 
              onChange={updateActiveTrade} 
              onAutoWin={generateAutoWin}
              isLive={isLive} 
            />
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
              <div className="w-full max-h-[70vh] overflow-y-auto overflow-x-hidden p-3 bg-gradient-to-b from-[#1E2329] to-[#0B0E11] rounded-[1.5rem] border border-white/5 shadow-2xl">
                <div className="w-full flex justify-center">
                  <div className="origin-top" style={{ transform: "scale(0.75)", transformOrigin: "top center" }}>
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
