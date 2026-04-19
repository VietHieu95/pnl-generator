import { useState, useEffect, useCallback, useRef } from "react";
import { PnlData } from "@shared/schema";
import { calculatePnlValues } from "@shared/calculations";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const defaultPnlData: PnlData = {
  id: Math.random().toString(36).substring(7),
  symbol: "BTCUSDT",
  type: "Perp",
  marginMode: "Cross",
  leverage: 20,
  positionType: "Long",
  signalBars: 1,
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

function loadTrades(): PnlData[] {
  try {
    const saved = localStorage.getItem("trades");
    const parsed = saved ? JSON.parse(saved) : [defaultPnlData];
    return parsed.map((t: PnlData) => ({
      ...t,
      id: t.id || Math.random().toString(36).substring(7),
    }));
  } catch {
    return [defaultPnlData];
  }
}

function loadActiveId(initialTrades: PnlData[]): string {
  const saved = localStorage.getItem("activeTradeId");
  return saved || initialTrades[0]?.id || defaultPnlData.id!;
}

/**
 * Manages the trades array, active trade, isLive mode,
 * server sync (AI Agent), and debounced localStorage persistence.
 */
export function useTradesState() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // --- Server sync for AI Agent ---
  const { data: serverPnl } = useQuery<PnlData>({
    queryKey: ["/api/pnl"],
    refetchInterval: 5000,
  });

  const updateServerPnl = useMutation({
    mutationFn: async (data: Partial<PnlData>) => {
      const res = await apiRequest("POST", "/api/pnl", data);
      return res.json();
    },
    onSuccess: (data) => qc.setQueryData(["/api/pnl"], data),
  });

  // --- Local state ---
  const [trades, setTrades] = useState<PnlData[]>(loadTrades);
  const [activeId, setActiveId] = useState<string>(() =>
    loadActiveId(loadTrades())
  );
  const [isLive, setIsLive] = useState(() => localStorage.getItem("isLive") === "true");
  
  // Track last edit time to prevent server overwrite during typing
  const lastEditTime = useRef<number>(0);

  // --- Debounced localStorage writes ---
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      localStorage.setItem("trades", JSON.stringify(trades));
      localStorage.setItem("activeTradeId", activeId);
      localStorage.setItem("isLive", isLive.toString());
    }, 300);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [trades, activeId, isLive]);

  // --- Server PNL sync (AI Agent updates) ---
  useEffect(() => {
    if (!serverPnl) return;
    
    // If we edited locally in the last 2 seconds, ignore server state to avoid race conditions
    if (Date.now() - lastEditTime.current < 2000) return;

    setTrades((prev) =>
      prev.map((t) => {
        if (t.id !== activeId) return t;
        // Only update if symbol matches (safety check for async state)
        if (serverPnl.symbol && t.symbol !== serverPnl.symbol) return t;
        return { ...t, ...serverPnl, id: t.id };
      })
    );
  }, [serverPnl, activeId]);

  // --- Derived ---
  const activeTrade = trades.find((t) => t.id === activeId) || trades[0];

  // --- Actions ---
  const addTrade = useCallback(() => {
    lastEditTime.current = Date.now();
    const last = trades[trades.length - 1];
    const newTrade: PnlData = {
      ...defaultPnlData,
      id: Math.random().toString(36).substring(7),
      symbol: last?.symbol || "BTCUSDT",
      walletBalance: activeTrade?.walletBalance ?? defaultPnlData.walletBalance,
    };
    setTrades((prev) => [...prev, newTrade]);
    setActiveId(newTrade.id!);
    toast({ title: "New Trade Added", description: "You now have a new trade slot." });
  }, [trades, activeTrade, toast]);

  const deleteTrade = useCallback(
    (id: string, e: React.MouseEvent) => {
      lastEditTime.current = Date.now();
      e.stopPropagation();
      if (trades.length === 1) {
        toast({ title: "Cannot Delete", description: "You must have at least one trade.", variant: "destructive" });
        return;
      }
      setTrades((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (activeId === id) setActiveId(next[0]?.id!);
        return next;
      });
      toast({ title: "Trade Deleted" });
    },
    [trades.length, activeId, toast]
  );

  // Debounce server updates to avoid flooding API on every keystroke
  const serverUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const updateActiveTrade = useCallback(
    (data: PnlData) => {
      lastEditTime.current = Date.now();
      
      // Calculate immediately on change instead of global useEffect
      const calculated = calculatePnlValues(data) as PnlData;
      setTrades((prev) => prev.map((t) => (t.id === activeId ? calculated : t)));
      
      // Debounce server update
      if (serverUpdateTimer.current) clearTimeout(serverUpdateTimer.current);
      serverUpdateTimer.current = setTimeout(() => {
        updateServerPnl.mutate(calculated);
      }, 500);
    },
    [activeId, updateServerPnl]
  );

  /** Called by useBinanceTicker when a live price arrives */
  const updateTradePrice = useCallback((symbol: string, price: number) => {
    setTrades((prev) =>
      prev.map((t) => {
        if (t.symbol.toUpperCase() !== symbol.toUpperCase()) return t;
        const updated = { ...t, markPrice: price };
        return calculatePnlValues(updated) as PnlData;
      })
    );
  }, []);

  const resetActiveTrade = useCallback(() => {
    setTrades((prev) =>
      prev.map((t) =>
        t.id === activeId
          ? { ...defaultPnlData, id: t.id, walletBalance: t.walletBalance }
          : t
      )
    );
    setIsLive(false);
    toast({ title: "Reset complete", description: "Active trade values reset, Capital remains saved." });
  }, [activeId, toast]);

  const generateAutoWin = useCallback(async () => {
    lastEditTime.current = Date.now();
    try {
      const active = trades.find((t) => t.id === activeId);
      if (!active) return;
      
      const symbol = active.symbol;

      // 1. Fetch Mark Price
      const priceRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`);
      const priceData = await priceRes.json();
      const markPrice = Number(priceData.price);

      // 2. Fetch Klines for range
      const klineRes = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1d&limit=2`);
      const klineData = await klineRes.json() as any[];
      const prices: number[] = [];
      klineData.forEach(c => { prices.push(Number(c[1])); prices.push(Number(c[4])); });
      const range = { min: Math.min(...prices), max: Math.max(...prices) };

      // 3. Calc Entry
      const targetProfit = 12000 + Math.random() * 6000;
      const positionType = active.positionType || "Long";
      let entryPrice: number;
      
      if (positionType === "Long") {
        const upperBound = Math.min(range.max, markPrice * 0.999);
        const lowerBound = range.min;
        entryPrice = upperBound > lowerBound ? lowerBound + (Math.random() * (upperBound - lowerBound) * 0.8) : markPrice * 0.95;
      } else {
        const lowerBound = Math.max(range.min, markPrice * 1.001);
        const upperBound = range.max;
        entryPrice = upperBound > lowerBound ? lowerBound + (Math.random() * (upperBound - lowerBound) * 0.8) : markPrice * 1.05;
      }

      // 4. Calc Size
      let size = targetProfit / (Math.abs(markPrice - entryPrice));
      const sizeDecimals = size > 1000 ? 0 : size > 10 ? 2 : 4;

      const autoWinData = {
        markPrice,
        entryPrice: Number(entryPrice.toFixed(8)),
        size: Number(size.toFixed(sizeDecimals)),
        unrealizedPnl: Number(targetProfit.toFixed(2)),
      };

      // 6. Full Refresh of PNL Values (ROI, liqPrice, etc.)
      const updatedTrade = calculatePnlValues({ ...active, ...autoWinData }) as PnlData;

      setTrades((prev) => prev.map((t) => (t.id === activeId ? { ...updatedTrade, id: t.id } : t)));
      
      // 7. Sync to Server immediately
      updateServerPnl.mutate(updatedTrade);
      
      toast({ 
        title: "Magic Win Generated!", 
        description: "Lệnh đã được tính toán khớp lưu với giá chart realtime." 
      });
    } catch (error) {
      toast({ title: "Failed to generate win", variant: "destructive" });
    }
  }, [activeId, trades, updateServerPnl, toast]);

  const scalpHotCoin = useCallback(async (symbol: string) => {
    lastEditTime.current = Date.now();
    try {
      const active = trades.find((t) => t.id === activeId);
      if (!active) return;

      // 1. Fetch Mark Price
      const priceRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`);
      const priceData = await priceRes.json();
      const markPrice = Number(priceData.price);

      // 2. Fetch Klines for range
      const klineRes = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1d&limit=2`);
      const klineData = await klineRes.json() as any[];
      const prices: number[] = [];
      klineData.forEach(c => { prices.push(Number(c[1])); prices.push(Number(c[4])); });
      const range = { min: Math.min(...prices), max: Math.max(...prices) };

      // 3. Calc Entry (Realistic win)
      const targetProfit = 12000 + Math.random() * 6000;
      const upperBound = Math.min(range.max, markPrice * 0.999);
      const lowerBound = range.min;
      const entryPrice = upperBound > lowerBound ? lowerBound + (Math.random() * (upperBound - lowerBound) * 0.8) : markPrice * 0.95;

      // 4. Calc Size
      let size = targetProfit / (Math.abs(markPrice - entryPrice));
      const sizeDecimals = size > 1000 ? 0 : size > 10 ? 2 : 4;

      // 5. Detect Unit
      let sizeUnit = active.sizeUnit;
      if (symbol.endsWith("USDT")) {
        sizeUnit = symbol.replace("USDT", "");
      } else if (symbol.endsWith("BUSD")) {
        sizeUnit = symbol.replace("BUSD", "");
      }

      const rawData = {
        ...active,
        symbol,
        sizeUnit,
        positionType: "Long" as const,
        markPrice,
        entryPrice: Number(entryPrice.toFixed(8)),
        size: Number(size.toFixed(sizeDecimals)),
      };

      // 6. Full Refresh of PNL Values (ROI, liqPrice, etc.)
      const autoWinData = calculatePnlValues(rawData) as PnlData;

      setTrades((prev) => prev.map((t) => (t.id === activeId ? { ...autoWinData, id: t.id } : t)));
      
      // 7. Sync to Server immediately to prevent polling overwrite
      updateServerPnl.mutate(autoWinData);
      
      toast({ 
        title: `Scalping ${symbol}!`, 
        description: "Đã tạo vị thế nhồi lệnh theo sóng tăng của coin hot." 
      });
    } catch (error) {
      toast({ title: "Failed to scalp", variant: "destructive" });
    }
  }, [activeId, trades, updateServerPnl, toast]);

  return {
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
  };
}
