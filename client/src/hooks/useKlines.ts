import { useEffect, useState } from "react";

export type Candle = { t: number; o: number; h: number; l: number; c: number };

export const CHART_INTERVALS = ["1s", "1m", "3m", "5m", "15m", "30m", "1h"] as const;
export type ChartInterval = (typeof CHART_INTERVALS)[number];

const INTERVAL_MS: Record<ChartInterval, number> = {
  "1s": 1_000,
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  "15m": 900_000,
  "30m": 1_800_000,
  "1h": 3_600_000,
};

export const intervalMs = (interval: ChartInterval) => INTERVAL_MS[interval];

export function parseInterval(value: string | null | undefined): ChartInterval {
  return (CHART_INTERVALS as readonly string[]).includes(value ?? "") ? (value as ChartInterval) : "1m";
}

const FAPI = "https://fapi.binance.com/fapi/v1/klines";

const decimalsOf = (s: string) => (s.includes(".") ? s.split(".")[1].length : 0);

/**
 * Candles for the chart under the PnL card, from Binance USDⓈ-M futures.
 * `live` keeps the last candle moving through the kline WebSocket stream.
 * `priceDecimals` comes from the raw price strings, which Binance pads to the
 * symbol's price precision, so axis labels match the exchange (0.0258080).
 */
export function useKlines(symbol: string, interval: ChartInterval, live: boolean, limit = 120) {
  const [state, setState] = useState<{
    candles: Candle[];
    priceDecimals: number;
    ready: boolean;
    error: string | null;
  }>({ candles: [], priceDecimals: 2, ready: false, error: null });

  const sym = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  useEffect(() => {
    if (!sym) return;
    let stopped = false;
    let ws: WebSocket | null = null;
    setState((s) => ({ ...s, ready: false, error: null }));

    const load = async () => {
      try {
        const res = await fetch(`${FAPI}?symbol=${sym}&interval=${interval}&limit=${limit}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = (await res.json()) as string[][];
        if (stopped) return;
        let dec = 0;
        const candles = rows.map((r) => {
          dec = Math.max(dec, decimalsOf(r[1]), decimalsOf(r[4]));
          return { t: Number(r[0]), o: Number(r[1]), h: Number(r[2]), l: Number(r[3]), c: Number(r[4]) };
        });
        setState({ candles, priceDecimals: dec || 2, ready: true, error: null });
      } catch (err) {
        if (!stopped) setState((s) => ({ ...s, ready: true, error: String((err as Error)?.message || err) }));
      }
    };
    void load();

    if (live) {
      // USDⓈ-M market streams live under /market now; the old /ws path stays silent.
      ws = new WebSocket(`wss://fstream.binance.com/market/ws/${sym.toLowerCase()}@kline_${interval}`);
      ws.onmessage = (ev) => {
        try {
          const k = JSON.parse(ev.data)?.k;
          if (!k) return;
          const next: Candle = { t: Number(k.t), o: Number(k.o), h: Number(k.h), l: Number(k.l), c: Number(k.c) };
          setState((s) => {
            if (!s.candles.length) return s;
            const last = s.candles[s.candles.length - 1];
            if (next.t === last.t) return { ...s, candles: [...s.candles.slice(0, -1), next] };
            if (next.t > last.t) return { ...s, candles: [...s.candles.slice(-(limit - 1)), next] };
            return s;
          });
        } catch {
          /* ignore malformed frames */
        }
      };
    }

    return () => {
      stopped = true;
      ws?.close();
    };
  }, [sym, interval, live, limit]);

  return state;
}

/**
 * Stand-in candles when the symbol has no Binance futures market (or the
 * request failed): a random walk that ends on the card's mark price and stays
 * around the entry, so the entry line and PnL tag still make sense.
 */
export function syntheticCandles(entry: number, mark: number, interval: ChartInterval, now = Date.now()): Candle[] {
  const n = 70;
  const step = intervalMs(interval);
  const lastOpen = Math.floor(now / step) * step;
  const span = Math.max(Math.abs(mark - entry), Math.abs(entry) * 0.004) || 1;
  let seed = Math.floor(entry * 1000 + mark * 7) % 2147483647 || 1;
  const rnd = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
  const out: Candle[] = [];
  let price = entry + (rnd() - 0.5) * span;
  for (let i = 0; i < n; i++) {
    const target = i === n - 1 ? mark : price + (rnd() - 0.5) * span * 0.35 + (mark - price) * (i / n) * 0.08;
    const o = price;
    const c = target;
    const h = Math.max(o, c) + rnd() * span * 0.12;
    const l = Math.min(o, c) - rnd() * span * 0.12;
    out.push({ t: lastOpen - (n - 1 - i) * step, o, h, l, c });
    price = c;
  }
  return out;
}
