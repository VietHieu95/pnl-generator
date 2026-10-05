import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PnlData } from "@shared/schema";
import {
  calcRealizedPnl,
  fetchSymbolFeeInfo,
  type RealizedPnlBreakdown,
  type SymbolFeeInfo,
} from "@shared/realizedPnl";

export interface RealizedPnlState extends RealizedPnlBreakdown {
  info: SymbolFeeInfo | null;
  loading: boolean;
  /** true when the user typed a value instead of using the computed one */
  isManual: boolean;
}

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// Re-check funding this often; the shared cache keeps it to one request per settlement
const REFRESH_MS = 30_000;
// Export must not hang on Binance (iOS share sheet needs the user gesture to stay fresh)
const EXPORT_REFRESH_TIMEOUT_MS = 2_500;

/**
 * Computes the card's Realized PNL from the coin's real Binance fee class and funding
 * history (fetched straight from fapi, which allows CORS). A manual value wins.
 * Stays live: funding is re-checked every 30s and the hold window slides with the clock.
 */
export function useRealizedPnl(trade: PnlData | undefined) {
  const symbol = trade?.symbol.trim().toUpperCase() ?? "";
  const symbolRef = useRef(symbol);
  symbolRef.current = symbol;

  const [info, setInfo] = useState<SymbolFeeInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async (fresh: boolean) => {
    const target = symbolRef.current;
    if (!target) return;
    try {
      const next = await fetchSymbolFeeInfo(target, { fresh });
      if (symbolRef.current === target) setInfo(next);
    } catch (err) {
      console.warn("[RealizedPnl] Binance fee info failed:", err);
      if (symbolRef.current === target) setInfo(null);
    } finally {
      if (symbolRef.current === target) setNow(Date.now());
    }
  }, []);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    // Debounce so typing a symbol doesn't fire a request per keystroke
    const first = setTimeout(() => load(false).finally(() => setLoading(false)), 400);
    const poll = setInterval(() => load(false), REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
    };
  }, [symbol, load]);

  /** Bypass the cache right before capturing an image (bounded by a timeout). */
  const refresh = useCallback(async () => {
    await Promise.race([
      load(true),
      new Promise<void>((resolve) => setTimeout(resolve, EXPORT_REFRESH_TIMEOUT_MS)),
    ]);
  }, [load]);

  const matchingInfo = info?.symbol === symbol ? info : null;

  const state: RealizedPnlState | undefined = useMemo(() => {
    if (!trade) return undefined;
    const breakdown = calcRealizedPnl(trade, matchingInfo, now);
    return { ...breakdown, info: matchingInfo, loading, isManual: isNumber(trade.realizedPnl) };
  }, [trade, matchingInfo, loading, now]);

  const cardData: PnlData | undefined = useMemo(() => {
    if (!trade || !state) return trade;
    return state.isManual ? trade : { ...trade, realizedPnl: state.total };
  }, [trade, state]);

  return { realized: state, cardData, refresh };
}
