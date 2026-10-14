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

/* ---------------------------------------------------------------------------
 * Auto timeframe: pick the interval whose chart shows the entry best.
 * ------------------------------------------------------------------------- */

export const AUTO_CANDIDATES: ChartInterval[] = ["1m", "3m", "5m", "15m", "30m", "1h"];
/** Candles on screen in the default chart view (lastX / pitch + 2). */
export const VISIBLE_CANDLES = 59;

type Trade = { entry: number; mark: number; side: "Long" | "Short" };

/**
 * Score how well one timeframe "sells" the entry, on the candles that would be on
 * screen (rescaled onto the card's mark price like the chart does):
 *  - the entry sits inside the candle range (not pinned to the edge)
 *  - a candle actually traded through the entry price, followed by a run of candles
 *    (the "entered here, then it moved" story)
 *  - entry -> current price covers about two thirds of the chart height
 */
export function scoreInterval(candles: Candle[], t: Trade): number {
  const vis = candles.slice(-VISIBLE_CANDLES);
  if (vis.length < 10 || !(t.entry > 0) || !(t.mark > 0)) return -Infinity;
  const rawClose = vis[vis.length - 1].c;
  const k = Math.abs(t.mark / rawClose - 1) > 0.002 ? t.mark / rawClose : 1;
  const hi = Math.max(...vis.map((c) => c.h)) * k;
  const lo = Math.min(...vis.map((c) => c.l)) * k;
  const close = t.mark;
  const cHi = Math.max(hi, close);
  const cLo = Math.min(lo, close);
  const candleSpan = cHi - cLo || close * 0.002;
  if (t.entry > cHi + candleSpan || t.entry < cLo - candleSpan) return -1; // would be pinned
  const span = Math.max(cHi, t.entry) - Math.min(cLo, t.entry);
  let score = 0;
  // entry inside the candles (best) or just outside
  score += t.entry <= cHi && t.entry >= cLo ? 1 : 0.3;
  // entry -> now as a share of the chart height, best around 0.65
  const frac = Math.abs(close - t.entry) / span;
  score += Math.max(0, 1 - Math.abs(frac - 0.65) * 2);
  // most recent candle that traded through the entry, and how long the move since is
  let lastTouch = -1;
  vis.forEach((c, i) => {
    if (c.l * k <= t.entry && c.h * k >= t.entry) lastTouch = i;
  });
  if (lastTouch >= 0) {
    const run = vis.length - 1 - lastTouch;
    score += run >= 10 && run <= 50 ? 0.8 : run > 50 ? 0.5 : 0.3;
  }
  // the move should go the position's way (a winning card looks best)
  const dir = t.side === "Short" ? -1 : 1;
  if ((close - t.entry) * dir > 0) score += 0.2;
  return score;
}

/**
 * Loads every candidate timeframe and returns the best one with its candles, so a
 * one-shot render (the bots) does not have to fetch twice.
 */
export function useAutoInterval(symbol: string, t: Trade | null, enabled: boolean) {
  const [state, setState] = useState<{ interval: ChartInterval; candles: Candle[]; priceDecimals: number; ready: boolean }>({
    interval: "1m", candles: [], priceDecimals: 2, ready: false,
  });
  const sym = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const key = t ? `${t.entry}|${t.side}|${t.mark.toPrecision(3)}` : "";

  useEffect(() => {
    if (!enabled || !sym || !t) return;
    let stopped = false;
    setState((s) => ({ ...s, ready: false }));
    (async () => {
      const results = await Promise.all(
        AUTO_CANDIDATES.map(async (iv) => {
          try {
            const res = await fetch(`${FAPI}?symbol=${sym}&interval=${iv}&limit=${VISIBLE_CANDLES + 10}`);
            if (!res.ok) return null;
            const rows = (await res.json()) as string[][];
            let dec = 0;
            const candles = rows.map((r) => {
              dec = Math.max(dec, decimalsOf(r[1]), decimalsOf(r[4]));
              return { t: Number(r[0]), o: Number(r[1]), h: Number(r[2]), l: Number(r[3]), c: Number(r[4]) };
            });
            return { iv, candles, dec: dec || 2, score: scoreInterval(candles, t) };
          } catch {
            return null;
          }
        })
      );
      if (stopped) return;
      const ok = results.filter((r): r is NonNullable<typeof r> => !!r);
      // highest score wins; ties go to the shorter timeframe (fresher action)
      const best = ok.reduce<(typeof ok)[number] | null>((b, r) => (!b || r.score > b.score + 1e-9 ? r : b), null);
      setState(
        best
          ? { interval: best.iv, candles: best.candles, priceDecimals: best.dec, ready: true }
          : { interval: "1m", candles: [], priceDecimals: 2, ready: true }
      );
    })();
    return () => {
      stopped = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sym, key, enabled]);

  return state;
}
