import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PnlData } from "@shared/schema";
import { getCardColors, getCardLocale, type PnlCardLanguage, type PnlCardTheme } from "@/components/PnlCard";
import { CHART_INTERVALS, intervalMs, type Candle, type ChartInterval } from "@/hooks/useKlines";

/*
 * Binance-app style candlestick panel that sits under the PnL card (480px wide).
 * Every coordinate below was measured on a reference app screenshot (1100px wide,
 * 2.2857 px per CSS px) and is expressed in card coordinates: y counts from the
 * top of the card, so the panel itself starts at CARD_H.
 */
export const CARD_H = 297;
export const CHART_H = 260;
const W = 480;

const L = {
  innerDivider: { x0: 16, x1: 463.6, y: 301.05, h: 0.75 },
  line1: 307.35,
  handle: { x: 216.4, y: 312.15, w: 45.1, h: 6.6 },
  line2: 324.85,
  tabBaseline: 344.9,
  tabX: { Time: 24.8, "1s": 81.6, "1m": 121.9, "3m": 166.1, "5m": 211.2, "15m": 256.6, "30m": 308.3, "1h": 361.6 } as Record<string, number>,
  icon: { x: 412.8, y: 333.3, s: 14.2 },
  tabDivider: { x: 437.6, y0: 324.85, y1: 350.65 },
  caret: { x0: 451.8, x1: 458.8, y0: 338.85, y1: 343.25 },
  plotTop: 352,
  plotBottom: 545,
  gridY: [380.45, 412.15, 443.85, 475.6, 507.35, 539.05],
  highY: 387.65,
  lowY: 531.65,
  pitch: 4.631,
  body: 3.5,
  wick: 0.9,
  lastX: 268.2,
  vgridOffset: 18, // candles before the last one where the first time line sits
  vgridStep: 35, // candles between time lines
  axisLeft: 404.1,
  axisTextRight: 475.4,
  timeBaseline: 551.5,
  markerLine: 15.3,
  markerGap: 2.2,
};

const BINANCE_LOGO =
  "M83.0 50.4 L81.2 50.0 L68.0 36.8 L60.0 29.8 L39.0 50.7 L38.0 50.6 L36.0 49.0 L26.1 39.0 L25.7 38.0 L32.0 31.1 L60.0 3.6 L62.0 4.8 L76.8 19.0 L85.0 27.7 L94.7 37.0 L95.2 38.0 L94.2 40.0 L83.0 50.4 Z M490.0 92.2 L484.0 92.1 L478.0 91.3 L472.0 89.3 L466.3 86.0 L461.9 82.0 L457.8 76.0 L455.7 71.0 L454.6 66.0 L454.4 56.0 L455.7 50.0 L458.2 45.0 L461.7 40.0 L465.0 36.8 L470.4 33.0 L476.0 30.7 L482.0 29.6 L488.0 29.5 L495.0 30.6 L499.0 31.8 L503.0 33.6 L508.0 37.0 L509.6 39.0 L509.4 40.0 L503.4 47.0 L501.0 48.7 L495.0 44.7 L490.0 42.7 L482.0 42.5 L477.0 44.5 L474.0 46.9 L471.5 50.0 L469.9 53.0 L468.6 59.0 L469.8 68.0 L472.0 71.9 L476.0 76.2 L480.0 78.4 L483.0 79.0 L490.0 79.1 L493.0 78.4 L498.0 75.4 L501.0 72.8 L502.0 72.9 L509.2 80.0 L509.7 82.0 L502.6 88.0 L498.0 90.2 L490.0 92.2 Z M151.0 91.0 L139.0 91.2 L136.9 90.0 L136.8 37.0 L137.5 31.0 L139.0 30.6 L167.0 30.5 L173.0 31.4 L178.0 33.8 L181.9 37.0 L183.4 39.0 L185.2 44.0 L185.4 48.0 L184.4 52.0 L182.0 56.0 L178.6 59.0 L178.8 60.0 L182.0 61.8 L185.0 64.4 L187.4 68.0 L188.4 72.0 L188.4 75.0 L187.3 81.0 L185.6 84.0 L183.0 86.6 L180.0 88.4 L175.0 90.4 L151.0 91.0 Z M218.0 90.3 L216.0 90.9 L208.0 90.9 L206.0 90.8 L204.7 90.0 L204.4 34.0 L204.9 31.0 L206.0 30.5 L217.0 30.5 L218.0 30.8 L218.4 32.0 L218.6 86.0 L218.4 90.0 L218.0 90.3 Z M286.0 91.1 L282.0 91.2 L280.0 90.6 L252.0 54.1 L251.5 56.0 L251.4 90.0 L251.0 90.6 L249.0 91.1 L240.0 91.2 L238.0 90.3 L237.6 87.0 L237.6 37.0 L238.0 32.0 L238.7 31.0 L249.0 30.4 L251.0 31.1 L278.0 66.5 L278.5 64.0 L278.1 57.0 L278.5 32.0 L279.0 31.0 L280.0 30.6 L289.0 30.4 L291.0 30.5 L291.6 31.0 L292.0 35.0 L291.7 56.0 L292.1 60.0 L291.7 90.0 L291.0 90.9 L286.0 91.1 Z M369.0 91.1 L356.0 90.9 L354.4 88.0 L351.0 79.4 L350.0 78.2 L347.0 77.8 L326.0 77.5 L324.6 79.0 L321.2 88.0 L319.0 91.0 L309.0 91.3 L307.0 90.7 L306.4 90.0 L307.7 86.0 L319.3 60.0 L319.5 58.0 L325.4 44.0 L332.0 30.4 L343.0 30.3 L344.8 31.0 L351.6 48.0 L355.2 55.0 L363.5 76.0 L369.2 88.0 L369.6 90.0 L369.0 91.1 Z M436.0 91.1 L427.0 91.0 L426.0 90.5 L398.0 54.2 L397.4 56.0 L397.4 90.0 L396.0 90.9 L392.0 91.1 L387.0 91.0 L383.9 90.0 L383.5 36.0 L384.0 30.8 L394.0 30.4 L397.0 31.0 L419.6 61.0 L423.0 64.6 L424.0 64.8 L424.5 58.0 L424.5 31.0 L431.0 30.4 L437.0 30.6 L437.5 31.0 L437.9 36.0 L437.8 81.0 L437.6 90.0 L437.0 90.8 L436.0 91.1 Z M568.0 91.0 L534.0 91.2 L526.0 90.7 L525.5 90.0 L525.4 77.0 L525.4 34.0 L526.0 30.6 L569.0 30.4 L571.2 31.0 L571.5 36.0 L571.0 42.3 L541.0 42.8 L540.0 43.0 L539.3 45.0 L539.4 53.0 L540.0 54.2 L566.0 54.6 L567.3 55.0 L567.6 63.0 L567.5 66.0 L567.0 66.5 L540.0 66.6 L539.2 67.0 L539.0 68.0 L538.8 76.0 L538.9 78.0 L540.0 78.7 L571.0 78.6 L571.6 80.0 L571.5 90.0 L571.0 90.7 L568.0 91.0 Z M167.8 54.0 L169.7 53.0 L171.3 51.0 L171.5 47.0 L170.0 44.5 L165.0 42.5 L152.0 42.5 L150.6 43.0 L150.4 53.0 L151.0 54.4 L164.0 54.7 L167.8 54.0 Z M17.0 72.6 L15.4 72.0 L3.6 60.0 L11.9 51.0 L16.0 47.5 L17.0 47.6 L19.0 49.4 L29.4 60.0 L17.0 72.6 Z M61.0 72.5 L59.3 72.0 L47.5 60.0 L50.0 56.6 L60.0 47.2 L61.0 47.4 L73.5 60.0 L68.0 66.1 L61.0 72.5 Z M105.0 72.4 L103.5 72.0 L91.6 60.0 L96.0 54.8 L104.0 47.3 L106.0 48.5 L117.2 60.0 L115.0 62.7 L105.0 72.4 Z M344.4 65.0 L343.2 60.0 L338.0 47.5 L336.8 49.0 L334.6 54.0 L330.8 65.0 L344.4 65.0 Z M171.1 78.0 L174.0 75.9 L174.9 73.0 L174.0 69.4 L171.0 67.3 L167.0 66.6 L152.0 66.6 L150.7 67.0 L150.4 77.0 L151.0 78.6 L167.0 78.6 L171.1 78.0 Z M61.0 116.2 L60.0 116.3 L59.0 115.4 L25.5 82.0 L25.6 81.0 L30.0 76.5 L31.0 76.1 L34.0 72.5 L38.0 69.2 L39.0 69.5 L60.0 89.8 L61.0 89.8 L63.0 88.3 L72.0 78.6 L82.0 69.3 L83.0 69.2 L95.3 82.0 L61.0 116.2 Z";

const FONT = { axis: 11, box: 11, time: 10.5, tab: 11.2, mark: 11 };
const CAP = 0.727; // Inter cap height / em, to centre digits on a line

type ChartColors = {
  bg: string; divider: string; line: string; handle: string; grid: string; axis: string; time: string;
  tab: string; tabActive: string; icon: string; watermark: string; text: string; boxBg: string;
};

function chartColors(theme: PnlCardTheme): ChartColors {
  if (theme === "light")
    return { bg: "#ffffff", divider: "#eeeeee", line: "#e9e9e9", handle: "#e6e6e6", grid: "#f2f2f2", axis: "#7d7d7d", time: "#8a8a8a",
      tab: "#707070", tabActive: "#000000", icon: "#9a9a9a", watermark: "#f2f2f2", text: "#000000", boxBg: "#ffffff" };
  if (theme === "black")
    return { bg: "#000000", divider: "#1c1c1c", line: "#222222", handle: "#262626", grid: "#171717", axis: "#8f8f8f", time: "#8a8a8a",
      tab: "#a2a2a2", tabActive: "#ffffff", icon: "#898989", watermark: "#141414", text: "#ffffff", boxBg: "#000000" };
  // dark: offsets from the card bg measured on the reference (bg #232531 there)
  return { bg: "#212630", divider: "#2d323c", line: "#333844", handle: "#272e3b", grid: "#2f343f", axis: "#9095a0", time: "#8a909b",
    tab: "#a2a6b1", tabActive: "#f7faff", icon: "#79808d", watermark: "#2b303a", text: "#f5f8fd", boxBg: "#212630" };
}

/** Rough Inter advance widths (em) so boxes can fit their text without measuring the DOM. */
function textWidth(s: string, size: number) {
  let em = 0;
  for (const ch of s) em += /[0-9]/.test(ch) ? 0.62 : /[.,:]/.test(ch) ? 0.28 : ch === " " ? 0.27 : ch === "-" ? 0.42 : 0.6;
  return em * size;
}

type View = { offset: number; zoom: number; range: { top: number; bottom: number } | null };
const DEFAULT_VIEW: View = { offset: 0, zoom: 1, range: null };
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export interface PnlChartProps {
  data: PnlData;
  candles: Candle[];
  interval: ChartInterval;
  priceDecimals: number;
  now: number;
  theme?: PnlCardTheme;
  language?: PnlCardLanguage;
  timeZone?: string;
  onIntervalChange?: (interval: ChartInterval) => void;
  /** Drag to pan, drag the price axis to rescale, wheel / pinch to zoom, double-click to reset. */
  interactive?: boolean;
}

export function PnlChart({
  data,
  candles,
  interval,
  priceDecimals,
  now,
  theme = "dark",
  language = "en",
  timeZone,
  onIntervalChange,
  interactive = false,
}: PnlChartProps) {
  const [view, setView] = useState<View>(DEFAULT_VIEW);
  const svgRef = useRef<SVGSVGElement>(null);
  const scaleRef = useRef({ top: 1, bottom: 0, pitch: L.pitch, N: 0 });
  const axisLeftRef = useRef(L.axisLeft);
  const anchorRef = useRef<{ key: string; ratio: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<
    | { mode: "pan" | "axis"; x: number; y: number; offset: number; top: number; bottom: number; manual: boolean }
    | { mode: "pinch"; dist: number; zoom: number }
    | null
  >(null);
  const clipId = `pnl-chart-clip-${useId().replace(/:/g, "")}`;

  // A new coin or timeframe starts back at the live edge with auto scale.
  useEffect(() => setView(DEFAULT_VIEW), [data.symbol, interval]);

  const toSvg = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    const k = W / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k + CARD_H };
  };
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const p = toSvg(e);
    if (p.y < L.plotTop) return; // tabs stay clickable
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      drag.current = { mode: "pinch", dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: view.zoom };
      return;
    }
    const { top, bottom } = scaleRef.current;
    drag.current = {
      mode: p.x >= axisLeftRef.current ? "axis" : "pan",
      x: p.x, y: p.y, offset: view.offset, top, bottom, manual: !!view.range,
    };
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d || !pointers.current.has(e.pointerId)) return;
    const p = toSvg(e);
    pointers.current.set(e.pointerId, p);
    const { pitch, N } = scaleRef.current;
    if (d.mode === "pinch") {
      if (pointers.current.size < 2) return;
      const [a, b] = Array.from(pointers.current.values());
      const zoom = clamp((d.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / d.dist, 0.35, 4);
      setView((v) => ({ ...v, zoom }));
    } else if (d.mode === "axis") {
      // Drag down on the price axis = wider range (zoom out), up = zoom in.
      const factor = Math.exp((p.y - d.y) * 0.012);
      const mid = (d.top + d.bottom) / 2;
      const half = ((d.top - d.bottom) / 2) * factor;
      setView((v) => ({ ...v, range: { top: mid + half, bottom: mid - half } }));
    } else {
      const offset = clamp(d.offset + (p.x - d.x) / pitch, -Math.floor((L.axisLeft - L.lastX) / pitch) + 1, Math.max(0, N - 8));
      const shift = d.manual ? ((p.y - d.y) / (L.lowY - L.highY)) * (d.top - d.bottom) : 0;
      setView((v) => ({ ...v, offset, range: d.manual ? { top: d.top + shift, bottom: d.bottom + shift } : v.range }));
    }
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) drag.current = null;
    else if (drag.current?.mode === "pinch") {
      const [p] = Array.from(pointers.current.values());
      const { top, bottom } = scaleRef.current;
      drag.current = { mode: "pan", x: p.x, y: p.y, offset: view.offset, top, bottom, manual: !!view.range };
    }
  };
  // Wheel / trackpad zoom needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !interactive) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => ({ ...v, zoom: clamp(v.zoom * Math.exp(-e.deltaY * 0.0015), 0.35, 4) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [interactive]);

  const card = getCardColors(theme);
  const C = chartColors(theme);
  const locale = getCardLocale(theme, language);
  const isShort = data.positionType === "Short";
  const sideColor = isShort ? card.sideRed : card.sideGreen;

  const fmt = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: priceDecimals, maximumFractionDigits: priceDecimals }),
    [locale, priceDecimals]
  );
  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat("sv-SE", {
        timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
      }),
    [timeZone]
  );

  // ---- view: pan / zoom / manual price scale (interactive mode only) ----
  const N = candles.length;
  const pitch = L.pitch * view.zoom;
  const bodyW = Math.min(Math.max(L.body * view.zoom, 1), pitch * 0.82);
  // When the live market is far from the card's mark price (hand-made numbers, or a
  // stale ticker) rescale the candles so the last close lands on the card's mark:
  // the shape stays real and the chart agrees with the card above it.
  // The ratio is fixed once per coin / timeframe / mark price, so live ticks still move
  // the last candle (re-deriving it every tick pinned the close to the card's mark).
  const rawClose = candles[N - 1]?.c;
  const anchorKey = `${data.symbol}|${interval}|${data.markPrice}`;
  if (rawClose && anchorRef.current?.key !== anchorKey) {
    anchorRef.current = {
      key: anchorKey,
      ratio: data.markPrice > 0 && Math.abs(data.markPrice / rawClose - 1) > 0.002 ? data.markPrice / rawClose : 1,
    };
  }
  const anchor = anchorRef.current?.key === anchorKey ? anchorRef.current.ratio : 1;
  const all = useMemo(
    () => (anchor === 1 ? candles : candles.map((k) => ({ ...k, o: k.o * anchor, h: k.h * anchor, l: k.l * anchor, c: k.c * anchor }))),
    [candles, anchor]
  );
  const last = all[N - 1];
  // Candle index that sits at lastX (fractional while panning); offset 0 = live edge.
  const rightIdx = N - 1 - view.offset;
  const xOf = (i: number) => L.lastX - (rightIdx - i) * pitch;
  const firstIdx = Math.max(0, Math.floor(rightIdx - (L.lastX + pitch) / pitch));
  const lastIdx = Math.min(N - 1, Math.ceil(rightIdx + (L.axisLeft - L.lastX) / pitch));
  const visIdx: number[] = [];
  for (let i = firstIdx; i <= lastIdx; i++) visIdx.push(i);
  const lastVisible = lastIdx === N - 1;

  const entry = data.entryPrice;
  const close = last ? last.c : data.markPrice;
  let hi = -Infinity;
  let lo = Infinity;
  let hiIdx = -1;
  let loIdx = -1;
  visIdx.forEach((i) => {
    const k = all[i];
    if (k.h > hi) { hi = k.h; hiIdx = i; }
    if (k.l < lo) { lo = k.l; loIdx = i; }
  });
  if (hiIdx < 0) { hi = close; lo = close; }
  // Auto scale: visible candles (+ the live price when its candle is on screen). The
  // entry joins when it is near; far away it would squash the candles, so it is pinned.
  const withClose = lastVisible || !visIdx.length;
  const cHi = withClose ? Math.max(hi, close) : hi;
  const cLo = withClose ? Math.min(lo, close) : lo;
  const candleSpan = cHi - cLo || Math.abs(close) * 0.002 || 1;
  const entryFar = entry > cHi + candleSpan || entry < cLo - candleSpan;
  const autoTop = Math.max(cHi, entryFar ? -Infinity : entry);
  const autoBottom = Math.min(cLo, entryFar ? Infinity : entry);
  const top = view.range ? view.range.top : autoTop;
  const bottom = view.range ? view.range.bottom : autoBottom;
  const span = top - bottom || Math.abs(top) * 0.001 || 1;
  const yOf = (p: number) => L.highY + ((top - p) / span) * (L.lowY - L.highY);
  const priceAt = (y: number) => top - ((y - L.highY) / (L.lowY - L.highY)) * span;
  scaleRef.current = { top, bottom, pitch, N };

  // Axis area: as wide as the reference (76px) unless a long price needs more room.
  const axisLabelSample = fmt.format(Math.max(Math.abs(top), Math.abs(bottom)));
  const axisLeft = Math.min(L.axisLeft, L.axisTextRight - textWidth(axisLabelSample, FONT.box) - 7);
  const axisW = W - axisLeft;
  axisLeftRef.current = axisLeft;

  const clampY = (y: number, lo_: number, hi_: number) => Math.min(Math.max(y, lo_), hi_);
  const entryY = clampY(yOf(entry), L.plotTop + 11, L.plotBottom - 11);
  const closeY = clampY(yOf(close), L.plotTop + 11, L.plotBottom - 27);
  const centre = (y: number, size: number) => y + (size * CAP) / 2;

  const sizeText = (() => {
    const dec = (n: number) => n.toString().split(".")[1]?.length || 0;
    const d = Math.abs(data.size) < 1 ? Math.min(Math.max(dec(data.size), 3), 8) : Math.min(Math.max(dec(data.size), 1), 8);
    return new Intl.NumberFormat(locale, { minimumFractionDigits: d, maximumFractionDigits: d }).format(data.size);
  })();
  const pnlText = `PnL ${data.unrealizedPnl >= 0 ? "" : "-"}${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(data.unrealizedPnl))}`;
  const pnlColor = data.unrealizedPnl >= 0 ? card.sideGreen : card.sideRed;
  const pnlW = textWidth(pnlText, FONT.box) + 11.2;
  const sizeW = textWidth(sizeText, FONT.box) + 15.4;

  const step = intervalMs(interval);
  // Time left in the current candle, from the interval grid (a quiet market can
  // leave the last kline older than now).
  const remaining = Math.ceil((now + 1) / step) * step - now;
  const countdown = (() => {
    const s = Math.floor(remaining / 1000);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const p = (n: number) => String(n).padStart(2, "0");
    return hh > 0 ? `${p(hh)}:${p(mm)}:${p(ss)}` : `${p(mm)}:${p(ss)}`;
  })();

  // Time grid: one line every ~162px of candles, phase kept to the reference layout.
  const gridEvery = Math.max(1, Math.round((L.vgridStep * L.pitch) / pitch));
  const timeLines: { x: number; label: string }[] = [];
  visIdx.forEach((i) => {
    const back = N - 1 - L.vgridOffset - i;
    const x = xOf(i);
    if (((back % gridEvery) + gridEvery) % gridEvery === 0 && x >= -60 && x <= axisLeft - 20)
      timeLines.push({ x, label: timeFmt.format(new Date(all[i].t)).replace(",", "") });
  });

  const marker = (idx: number, price: number, y: number, key: string) => {
    if (idx < 0) return null;
    const x = xOf(idx);
    const text = fmt.format(price);
    const toLeft = x + L.markerLine + L.markerGap + textWidth(text, FONT.mark) > axisLeft - 4;
    const x2 = toLeft ? x - L.markerLine : x + L.markerLine;
    return (
      <g key={key}>
        <line x1={x} x2={x2} y1={y} y2={y} stroke={C.text} strokeWidth={0.75} />
        <text
          x={toLeft ? x2 - L.markerGap : x2 + L.markerGap}
          y={centre(y, FONT.mark)}
          textAnchor={toLeft ? "end" : "start"}
          fontSize={FONT.mark}
          fill={C.text}
        >
          {text}
        </text>
      </g>
    );
  };

  const tabs = ["Time", ...CHART_INTERVALS] as const;

  return (
    <svg
      ref={svgRef}
      width={W}
      height={CHART_H}
      viewBox={`0 ${CARD_H} ${W} ${CHART_H}`}
      style={{
        display: "block", backgroundColor: C.bg, fontFamily: '"Inter", sans-serif', fontFeatureSettings: '"tnum"',
        ...(interactive ? { touchAction: "none", userSelect: "none", cursor: drag.current ? "grabbing" : "crosshair" } : {}),
      }}
      data-testid="pnl-chart"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={interactive ? () => setView(DEFAULT_VIEW) : undefined}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={L.plotTop} width={axisLeft} height={L.plotBottom - L.plotTop} />
        </clipPath>
      </defs>
      <rect x={0} y={CARD_H} width={W} height={CHART_H} fill={C.bg} />

      {/* separators, drag handle, timeframe tabs */}
      <rect x={L.innerDivider.x0} y={L.innerDivider.y} width={L.innerDivider.x1 - L.innerDivider.x0} height={L.innerDivider.h} fill={C.divider} />
      <rect x={0} y={L.line1} width={W} height={0.5} fill={C.line} />
      <rect x={L.handle.x} y={L.handle.y} width={L.handle.w} height={L.handle.h} rx={L.handle.h / 2} fill={C.handle} />
      <rect x={0} y={L.line2} width={W} height={0.5} fill={C.line} />
      {tabs.map((t) => {
        const active = t === interval;
        const clickable = onIntervalChange && t !== "Time";
        return (
          <text
            key={t}
            x={L.tabX[t] - 0.7}
            y={L.tabBaseline}
            fontSize={FONT.tab}
            fontWeight={active ? 600 : 400}
            fill={active ? C.tabActive : C.tab}
            style={clickable ? { cursor: "pointer" } : undefined}
            onClick={clickable ? () => onIntervalChange!(t as ChartInterval) : undefined}
          >
            {t}
          </text>
        );
      })}
      {/* "exit fullscreen" icon, traced from the app at 29x29 (3px strokes): outer frame
          open at the bottom-right where the small square sits, arrow pointing into it */}
      <g
        transform={`translate(${L.icon.x} ${L.icon.y}) scale(${L.icon.s / 29}) translate(-6 -8)`}
        stroke={C.icon}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M33 21.5 V11 Q33 9 31 9 H9 Q7 9 7 11 V33 Q7 35 9 35 H18.5" />
        <rect x={23} y={26} width={10} height={9} rx={1.6} />
        <path d="M12.5 13.5 L19 20 M19 15 V21 H13" />
      </g>
      <rect x={L.tabDivider.x} y={L.tabDivider.y0} width={0.6} height={L.tabDivider.y1 - L.tabDivider.y0} fill={C.line} />
      <path d={`M${L.caret.x0} ${L.caret.y0} H${L.caret.x1} L${(L.caret.x0 + L.caret.x1) / 2} ${L.caret.y1} Z`} fill={C.icon} />

      {/* grid */}
      {L.gridY.map((y) => (
        <rect key={`g${y}`} x={0} y={y - 0.375} width={W} height={0.75} fill={C.grid} />
      ))}
      {timeLines.map(({ x }) => (
        <rect key={`v${x}`} x={x - 0.375} y={L.plotTop} width={0.75} height={L.gridY[L.gridY.length - 1] - L.plotTop} fill={C.grid} />
      ))}

      {/* watermark: the Binance logo traced from the official artwork (576x121 box),
          scaled to the app's chart watermark (~128px wide, centred at 240,439) */}
      <path
        transform="translate(175.10 425.46) scale(0.22575)"
        d={BINANCE_LOGO}
        fill={C.watermark}
        fillRule="evenodd"
      />

      <g clipPath={`url(#${clipId})`}>
      {/* candles */}
      {visIdx.map((i) => {
        const k = all[i];
        const x = xOf(i);
        const up = k.c >= k.o;
        const col = up ? card.sideGreen : card.sideRed;
        const yo = yOf(k.o);
        const yc = yOf(k.c);
        const bodyTop = Math.min(yo, yc);
        const bodyH = Math.max(Math.abs(yc - yo), 0.75);
        return (
          <g key={k.t}>
            <rect x={x - L.wick / 2} y={yOf(k.h)} width={L.wick} height={Math.max(yOf(k.l) - yOf(k.h), 0.75)} fill={col} />
            <rect x={x - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill={col} />
          </g>
        );
      })}

      </g>

      {/* axis price labels */}
      {L.gridY.map((y) => (
        <text key={`p${y}`} x={L.axisTextRight} y={y - 2.6} textAnchor="end" fontSize={FONT.axis} fill={C.axis}>
          {fmt.format(priceAt(y))}
        </text>
      ))}

      {/* time labels */}
      {timeLines.map(({ x, label }) => (
        <text key={`t${x}`} x={x} y={L.timeBaseline} textAnchor="middle" fontSize={FONT.time} fill={C.time}>
          {label}
        </text>
      ))}

      {/* high / low markers */}
      <g clipPath={`url(#${clipId})`}>
        {marker(hiIdx, hi, yOf(hi), "hi")}
        {marker(loIdx, lo, yOf(lo), "lo")}
      </g>

      {/* current price: dotted line + box with countdown */}
      {last && (
        <g>
          <line x1={lastVisible ? xOf(N - 1) + bodyW / 2 + 0.6 : 0} x2={axisLeft} y1={closeY} y2={closeY} stroke={C.text} strokeWidth={0.75} strokeDasharray="2.6 1.75" />
          <rect x={axisLeft + 2.05} y={closeY - 11} width={axisW - 3.25} height={37.2} rx={4.2} fill={C.boxBg} fillOpacity={0.82} stroke={C.text} strokeWidth={0.75} />
          <text x={L.axisTextRight} y={centre(closeY, FONT.box)} textAnchor="end" fontSize={FONT.box} fontWeight={500} fill={C.text}>
            {fmt.format(close)}
          </text>
          <text x={L.axisTextRight} y={centre(closeY + 15.2, FONT.box)} textAnchor="end" fontSize={FONT.box} fontWeight={500} fill={C.text}>
            {countdown}
          </text>
        </g>
      )}

      {/* entry line, PnL / size tag, entry price box */}
      <line x1={0} x2={axisLeft} y1={entryY} y2={entryY} stroke={sideColor} strokeOpacity={0.75} strokeWidth={0.9} strokeDasharray="3.5 0.9" />
      <g>
        <rect x={0.4} y={entryY - 10.3} width={pnlW + sizeW} height={20.6} rx={4.4} fill={C.boxBg} stroke={sideColor} strokeWidth={0.75} />
        <path
          d={`M${0.4 + 4.4} ${entryY - 10.3} H${pnlW} V${entryY + 10.3} H${0.4 + 4.4} A4.4 4.4 0 0 1 0.4 ${entryY + 5.9} V${entryY - 5.9} A4.4 4.4 0 0 1 ${0.4 + 4.4} ${entryY - 10.3} Z`}
          fill={pnlColor}
        />
        <text x={5.6} y={centre(entryY, FONT.box)} fontSize={FONT.box} fill="#ffffff">{pnlText}</text>
        <text x={pnlW + sizeW / 2} y={centre(entryY, FONT.box)} textAnchor="middle" fontSize={FONT.box} fill={sideColor}>{sizeText}</text>
      </g>
      <rect x={axisLeft} y={entryY - 10.3} width={axisW - 1.6} height={20.6} rx={4.4} fill={C.boxBg} stroke={sideColor} strokeWidth={0.75} />
      <text x={L.axisTextRight - 1.5} y={centre(entryY, FONT.box)} textAnchor="end" fontSize={FONT.box} fontWeight={500} fill={sideColor}>
        {fmt.format(entry)}
      </text>
    </svg>
  );
}
