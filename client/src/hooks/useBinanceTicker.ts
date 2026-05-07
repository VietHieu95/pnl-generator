import { useEffect, useMemo } from "react";
import { PnlData } from "@shared/schema";

type PriceUpdateCallback = (symbol: string, price: number) => void;

/**
 * Subscribes to Binance futures ticker WebSocket for the given symbols.
 * Only reconnects when the list of symbols actually changes or isLive toggled.
 */
export function useBinanceTicker(
  trades: PnlData[],
  isLive: boolean,
  onPriceUpdate: PriceUpdateCallback
) {
  // Stable key: only changes when symbols actually change
  const symbolsKey = useMemo(
    () =>
      Array.from(new Set(trades.map((t) => t.symbol.toLowerCase())))
        .sort()
        .join(","),
    [trades.map((t) => t.symbol).sort().join(",")]
  );

  useEffect(() => {
    if (!isLive || !symbolsKey) return;

    const symbols = symbolsKey.split(",");
    const streams = symbols.map((s) => `${s}@ticker`).join("/");
    const ws = new WebSocket(
      `wss://fstream.binance.com/stream?streams=${streams}`
    );

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.data && msg.data.e === "24hrTicker") {
        onPriceUpdate(msg.data.s as string, parseFloat(msg.data.c));
      }
    };

    ws.onerror = (err) => {
      console.warn("[BinanceTicker] WebSocket error:", err);
    };

    return () => ws.close();
  }, [isLive, symbolsKey]);
}
