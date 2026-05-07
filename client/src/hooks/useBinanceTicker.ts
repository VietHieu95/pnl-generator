import { useEffect, useMemo } from "react";
import { PnlData } from "@shared/schema";

type PriceUpdateCallback = (symbol: string, price: number) => void;
type MarketPriceResponse = {
  prices?: Array<{ symbol: string; price: number }>;
};

const PRICE_POLL_MS = 2000;

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

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
      Array.from(new Set(trades.map((t) => normalizeSymbol(t.symbol))))
        .filter(Boolean)
        .sort()
        .join(","),
    [trades.map((t) => t.symbol).sort().join(",")]
  );

  useEffect(() => {
    if (!isLive || !symbolsKey) return;

    const symbols = symbolsKey.split(",");
    let stopped = false;

    const applyPrice = (symbol: string, price: number) => {
      if (!Number.isFinite(price) || price <= 0) return;
      onPriceUpdate(normalizeSymbol(symbol), price);
    };

    const fetchPrices = async () => {
      try {
        const response = await fetch(
          `/api/market-prices?symbols=${encodeURIComponent(symbolsKey)}`,
          { credentials: "include" }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const payload = (await response.json()) as MarketPriceResponse;
        if (stopped) return;

        payload.prices?.forEach(({ symbol, price }) => applyPrice(symbol, price));
      } catch (err) {
        console.warn("[BinanceTicker] Price polling error:", err);
      }
    };

    void fetchPrices();
    const pollTimer = window.setInterval(fetchPrices, PRICE_POLL_MS);

    const streams = symbols.map((s) => `${s.toLowerCase()}@ticker`).join("/");
    const ws = new WebSocket(
      `wss://fstream.binance.com/stream?streams=${streams}`
    );

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.data && msg.data.e === "24hrTicker") {
          applyPrice(msg.data.s as string, parseFloat(msg.data.c));
        }
      } catch (err) {
        console.warn("[BinanceTicker] Invalid WebSocket payload:", err);
      }
    };

    ws.onerror = (err) => {
      console.warn("[BinanceTicker] WebSocket error:", err);
    };

    return () => {
      stopped = true;
      window.clearInterval(pollTimer);
      ws.close();
    };
  }, [isLive, symbolsKey, onPriceUpdate]);
}
