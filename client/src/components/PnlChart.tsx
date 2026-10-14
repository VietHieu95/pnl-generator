import { useMemo } from "react";
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
}: PnlChartProps) {
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

  // Visible candles: the last one sits at lastX, older ones step left by pitch.
  const visibleCount = Math.floor(L.lastX / L.pitch) + 2;
  // When the live market is far from the card's mark price (hand-made numbers, or a
  // stale ticker) rescale the candles so the last close lands on the card's mark:
  // the shape stays real and the chart agrees with the card above it.
  const rawVisible = candles.slice(-visibleCount);
  const rawClose = rawVisible[rawVisible.length - 1]?.c;
  const anchor = rawClose && data.markPrice > 0 && Math.abs(data.markPrice / rawClose - 1) > 0.002 ? data.markPrice / rawClose : 1;
  const visible = anchor === 1 ? rawVisible : rawVisible.map((k) => ({ ...k, o: k.o * anchor, h: k.h * anchor, l: k.l * anchor, c: k.c * anchor }));
  const last = visible[visible.length - 1];
  const xOf = (i: number) => L.lastX - (visible.length - 1 - i) * L.pitch;

  const entry = data.entryPrice;
  const close = last ? last.c : data.markPrice;
  let hi = -Infinity;
  let lo = Infinity;
  let hiIdx = -1;
  let loIdx = -1;
  visible.forEach((k, i) => {
    if (k.h > hi) { hi = k.h; hiIdx = i; }
    if (k.l < lo) { lo = k.l; loIdx = i; }
  });
  // The entry joins the price scale when it is near the candles; far away it would
  // squash them flat, so it is pinned to the chart edge instead (label keeps the price).
  const candleSpan = Math.max(hi, close) - Math.min(lo, close) || Math.abs(close) * 0.002 || 1;
  const entryFar = entry > Math.max(hi, close) + candleSpan || entry < Math.min(lo, close) - candleSpan;
  const top = Math.max(hi, close, entryFar ? -Infinity : entry);
  const bottom = Math.min(lo, close, entryFar ? Infinity : entry);
  const span = top - bottom || Math.abs(top) * 0.001 || 1;
  const yOf = (p: number) => L.highY + ((top - p) / span) * (L.lowY - L.highY);
  const priceAt = (y: number) => top - ((y - L.highY) / (L.lowY - L.highY)) * span;

  // Axis area: as wide as the reference (76px) unless a long price needs more room.
  const axisLabelSample = fmt.format(Math.max(Math.abs(top), Math.abs(bottom)));
  const axisLeft = Math.min(L.axisLeft, L.axisTextRight - textWidth(axisLabelSample, FONT.box) - 7);
  const axisW = W - axisLeft;

  const entryY = entryFar ? (entry > top ? L.highY - 2 : L.lowY + 2) : yOf(entry);
  const closeY = yOf(close);
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

  const timeLines: { x: number; label: string }[] = [];
  for (let back = L.vgridOffset; back < visible.length; back += L.vgridStep) {
    const i = visible.length - 1 - back;
    timeLines.push({ x: xOf(i), label: timeFmt.format(new Date(visible[i].t)).replace(",", "") });
  }

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
      width={W}
      height={CHART_H}
      viewBox={`0 ${CARD_H} ${W} ${CHART_H}`}
      style={{ display: "block", backgroundColor: C.bg, fontFamily: '"Inter", sans-serif', fontFeatureSettings: '"tnum"' }}
      data-testid="pnl-chart"
    >
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
      <g stroke={C.icon} strokeWidth={1.1} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x={L.icon.x + 0.5} y={L.icon.y + 0.5} width={L.icon.s - 1} height={L.icon.s - 1} rx={1.6} />
        <path d={`M${L.icon.x + 3.4} ${L.icon.y + 3.4} L${L.icon.x + 7.4} ${L.icon.y + 7.4} M${L.icon.x + 7.4} ${L.icon.y + 4.4} V${L.icon.y + 7.4} H${L.icon.x + 4.4}`} />
      </g>
      <rect x={L.icon.x + 8.2} y={L.icon.y + 8.2} width={4.2} height={4.2} rx={0.6} fill="none" stroke={C.icon} strokeWidth={1.1} />
      <rect x={L.tabDivider.x} y={L.tabDivider.y0} width={0.6} height={L.tabDivider.y1 - L.tabDivider.y0} fill={C.line} />
      <path d={`M${L.caret.x0} ${L.caret.y0} H${L.caret.x1} L${(L.caret.x0 + L.caret.x1) / 2} ${L.caret.y1} Z`} fill={C.icon} />

      {/* grid */}
      {L.gridY.map((y) => (
        <rect key={`g${y}`} x={0} y={y - 0.375} width={W} height={0.75} fill={C.grid} />
      ))}
      {timeLines.map(({ x }) => (
        <rect key={`v${x}`} x={x - 0.375} y={L.plotTop} width={0.75} height={L.gridY[L.gridY.length - 1] - L.plotTop} fill={C.grid} />
      ))}

      {/* watermark */}
      <g fill={C.watermark} transform="translate(186.5 439)">
        <path d="M0 -11.5 L4.1 -7.4 L0 -3.3 L-4.1 -7.4Z M0 3.3 L4.1 7.4 L0 11.5 L-4.1 7.4Z M-11.5 0 L-7.4 -4.1 L-3.3 0 L-7.4 4.1Z M11.5 0 L7.4 -4.1 L3.3 0 L7.4 4.1Z M0 -2.6 L2.6 0 L0 2.6 L-2.6 0Z" />
        <text x={19.5} y={5.5} fontSize={15.2} fontWeight={700} letterSpacing={1.1}>BINANCE</text>
      </g>

      {/* candles */}
      {visible.map((k, i) => {
        const x = xOf(i);
        if (x < -L.pitch) return null;
        const up = k.c >= k.o;
        const col = up ? card.sideGreen : card.sideRed;
        const yo = yOf(k.o);
        const yc = yOf(k.c);
        const bodyTop = Math.min(yo, yc);
        const bodyH = Math.max(Math.abs(yc - yo), 0.75);
        return (
          <g key={k.t}>
            <rect x={x - L.wick / 2} y={yOf(k.h)} width={L.wick} height={Math.max(yOf(k.l) - yOf(k.h), 0.75)} fill={col} />
            <rect x={x - L.body / 2} y={bodyTop} width={L.body} height={bodyH} fill={col} />
          </g>
        );
      })}

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
      {marker(hiIdx, hi, yOf(hi), "hi")}
      {marker(loIdx, lo, yOf(lo), "lo")}

      {/* current price: dotted line + box with countdown */}
      {last && (
        <g>
          <line x1={xOf(visible.length - 1) + L.body / 2 + 0.6} x2={axisLeft} y1={closeY} y2={closeY} stroke={C.text} strokeWidth={0.75} strokeDasharray="2.6 1.75" />
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
