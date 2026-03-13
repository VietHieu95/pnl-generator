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
    setTrades((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, ...serverPnl, id: t.id } : t))
    );
  }, [serverPnl]); // intentionally omit activeId to avoid loop

  // --- Derived ---
  const activeTrade = trades.find((t) => t.id === activeId) || trades[0];

  // --- Actions ---
  const addTrade = useCallback(() => {
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

  const updateActiveTrade = useCallback(
    (data: PnlData) => {
      // Calculate immediately on change instead of global useEffect
      const calculated = calculatePnlValues(data) as PnlData;
      setTrades((prev) => prev.map((t) => (t.id === activeId ? calculated : t)));
      updateServerPnl.mutate(calculated);
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
  };
}
