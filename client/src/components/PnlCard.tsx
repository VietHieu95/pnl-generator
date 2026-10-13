import { PnlData } from "@shared/schema";
import type { ReactNode } from "react";
import { ChevronRight, Share2 } from "lucide-react";
import { calcRealizedPnl } from "@shared/realizedPnl";

export type PnlCardLanguage = "en" | "zh";

export type PnlCardTheme = "dark" | "light";

interface PnlCardProps {
  data: PnlData;
  language?: PnlCardLanguage;
  theme?: PnlCardTheme;
}

// Sampled from a Binance app screenshot (Display P3 converted to sRGB)
const DARK_COLORS = {
  bg: "#212630",
  label: "#979ca8",
  value: "#ebeef4",
  green: "#5fb98a",
  red: "#e25460",
  icon: "#737a87",
  chevron: "#949da8",
  dots: "#80848d",
  tagBg: "#28303d",
  tagBorder: "#444b58",
  boxBorder: "#353a46",
  button: "#333a47",
};

// Light mode, sampled from a Binance app screenshot in light mode
const LIGHT_COLORS: typeof DARK_COLORS = {
  bg: "#ffffff",
  label: "#747474",
  value: "#000000",
  green: "#00c07c",
  red: "#e8325c",
  icon: "#999999",
  chevron: "#787878",
  dots: "#808080",
  tagBg: "#f4f4f4",
  tagBorder: "#f4f4f4",
  boxBorder: "#e8e8e8",
  button: "#f0f0f0",
};

const LABELS = {
  en: {
    perp: "Perp",
    quarterly: "Quarterly",
    cross: "Cross",
    isolated: "Isolated",
    pnl: "PNL (USDT)",
    roi: "ROI",
    size: (unit: string) => `Size (${unit})`,
    margin: "Margin (USDT)",
    marginRatio: "Margin Ratio",
    entryPrice: "Entry Price (USDT)",
    markPrice: "Mark Price (USDT)",
    liqPrice: "Liq.Price (USDT)",
    realizedPnl: "Realized PNL (USDT)",
    leverage: "Leverage",
    tpsl: "TP/SL",
    close: "Close",
  },
  zh: {
    perp: "永續",
    quarterly: "季度",
    cross: "全倉",
    isolated: "逐倉",
    pnl: "未實現盈虧 (USDT)",
    roi: "收益率",
    size: () => "持倉數量 (USDT)",
    margin: "保證金 (USDT)",
    marginRatio: "保證金比例",
    entryPrice: "開倉價格 (USDT)",
    markPrice: "標記價格 (USDT)",
    liqPrice: "強平價格 (USDT)",
    realizedPnl: "已實現盈虧 (USDT)",
    leverage: "槓桿",
    tpsl: "止盈 / 止損",
    close: "關閉",
  },
};


// PNL / ROI headline numbers: proportional digits and slightly tight tracking, as in
// the reference app (tabular digits made "-2,18%" ~10% wider than the reference).
const BIG_NUMBER = { fontFeatureSettings: "normal", letterSpacing: "-0.6px" } as const;

// Side-badge letters as Inter SemiBold outlines (12.5px), pre-centred in the 17px
// badge. Text there depends on each browser's font metrics, and the Safari/iOS export
// put S/B ~1px off; a path renders identically everywhere.
const SIDE_GLYPH = {
  S: "M8.54 13.18Q7.49 13.18 6.71 12.85Q5.93 12.52 5.49 11.89Q5.05 11.26 5.02 10.36H6.62Q6.66 10.84 6.92 11.16Q7.18 11.47 7.6 11.63Q8.02 11.79 8.53 11.79Q9.07 11.79 9.48 11.62Q9.89 11.46 10.12 11.16Q10.36 10.86 10.36 10.47Q10.36 10.12 10.15 9.89Q9.95 9.65 9.58 9.49Q9.21 9.33 8.71 9.21L7.68 8.94Q6.54 8.65 5.9 8.06Q5.26 7.46 5.26 6.5Q5.26 5.7 5.7 5.09Q6.13 4.49 6.88 4.16Q7.63 3.82 8.59 3.82Q9.56 3.82 10.29 4.16Q11.02 4.49 11.43 5.08Q11.84 5.67 11.86 6.44H10.28Q10.22 5.85 9.76 5.53Q9.3 5.21 8.56 5.21Q8.05 5.21 7.68 5.36Q7.31 5.52 7.11 5.79Q6.91 6.06 6.91 6.4Q6.91 6.78 7.15 7.03Q7.38 7.27 7.74 7.42Q8.1 7.56 8.46 7.66L9.31 7.87Q9.82 7.99 10.29 8.2Q10.77 8.4 11.15 8.71Q11.54 9.02 11.76 9.45Q11.98 9.89 11.98 10.48Q11.98 11.28 11.58 11.89Q11.17 12.5 10.4 12.84Q9.63 13.18 8.54 13.18Z",
  B: "M5.12 13.05V3.95H8.6Q9.58 3.95 10.23 4.26Q10.88 4.57 11.21 5.11Q11.53 5.64 11.53 6.31Q11.53 6.87 11.32 7.26Q11.11 7.66 10.75 7.9Q10.39 8.14 9.94 8.25V8.34Q10.43 8.36 10.87 8.63Q11.32 8.9 11.6 9.39Q11.88 9.88 11.88 10.57Q11.88 11.27 11.54 11.84Q11.2 12.4 10.52 12.72Q9.83 13.05 8.79 13.05ZM6.75 11.68H8.53Q9.43 11.68 9.83 11.34Q10.23 10.99 10.23 10.45Q10.23 10.04 10.03 9.71Q9.83 9.39 9.46 9.19Q9.09 9 8.58 9H6.75ZM6.75 7.83H8.39Q8.82 7.83 9.16 7.67Q9.51 7.51 9.71 7.22Q9.9 6.92 9.9 6.52Q9.9 5.99 9.53 5.65Q9.16 5.31 8.43 5.31H6.75Z",
};

export function PnlCard({ data, language = "en", theme = "dark" }: PnlCardProps) {
  const isZh = language === "zh";
  const isLight = theme === "light";
  const COLORS = isLight ? LIGHT_COLORS : DARK_COLORS;
  const t = LABELS[language];
  // Dark English card uses the European format (1.234,56) like its reference app;
  // the light reference and the Chinese card use 1,234.56
  const locale = isZh || isLight ? "en-US" : "de-DE";

  const formatFixed = (num: number, decimals: number) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);

  const decimalsOf = (num: number) => num.toString().split(".")[1]?.length || 0;

  // Dynamic precision: as many decimals as the value carries (min 1, max 8)
  const formatPrice = (num: number, forceDecimals?: number) =>
    formatFixed(num, forceDecimals ?? Math.min(Math.max(decimalsOf(num), 1), 8));

  // Entry price decimals: BTC forced to 1dp, others dynamic from entry value
  const getEntryDecimals = () => {
    const base = data.symbol.toUpperCase().replace(/USDT$|BUSD$|USD$/, "");
    if (base === "BTC") return 1;
    let dec = decimalsOf(data.entryPrice);
    if (dec < 2 && data.entryPrice >= 1) dec = 2;
    return Math.min(dec, 8);
  };

  const entryDecimals = getEntryDecimals();
  // Mark price: always from the actual mark value, no forced rounding
  const markDecimals = Math.min(Math.max(decimalsOf(data.markPrice), 1), 8);
  // Liq price: at least the entry precision, more if the value carries it
  const liqDecimals = Math.min(Math.max(decimalsOf(data.liqPrice), entryDecimals), 8);

  // Coin sizes below 1 show at least 3 decimals, like the exchange (0,010 ETH, not 0,01)
  const sizeDecimals = Math.abs(data.size) < 1 ? Math.min(Math.max(decimalsOf(data.size), 3), 8) : undefined;

  const formatSigned = (num: number) => (num >= 0 ? "+" : "") + formatFixed(num, 2);

  const sizeUsdt =
    data.sizeUnit.toUpperCase() === "USDT" ? data.size : data.size * data.entryPrice;
  // Normally supplied by the caller (live fee + funding); fallback = opening fee only
  const realizedPnl =
    typeof data.realizedPnl === "number" && Number.isFinite(data.realizedPnl)
      ? data.realizedPnl
      : calcRealizedPnl(data, null).total;

  const signColor = (num: number) => (num >= 0 ? COLORS.green : COLORS.red);

  const renderNumber = (text: string) => {
    const numberFont = {
      // Apple devices draw digits in SF Pro like the reference app; everywhere else
      // (the Linux render server, Windows, Android) falls to the embedded Inter
      // instead of Roboto/Segoe UI, which looked nothing like the reference.
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
    };
    const commaFont = {
      fontFamily: "'IBM Plex Sans', sans-serif",
      fontSize: "0.85em",
    };
    const parts = text.split(",");
    if (parts.length === 1) return <span style={numberFont}>{text}</span>;

    return (
      <>
        {parts.map((part, index) => (
          <span key={`${part}-${index}`} style={numberFont}>
            {index > 0 && <span style={commaFont}>,</span>}
            {part}
          </span>
        ))}
      </>
    );
  };

  // Dotted underline: 0.75px dots every 2.2px, measured from the reference screenshot.
  const dotted = (content: ReactNode, className = "") => (
    <span className={`relative inline-block whitespace-nowrap pb-[5px] leading-none ${className}`}>
      <span>{content}</span>
      <span
        aria-hidden="true"
        className="absolute left-0 right-0 bottom-[1.35px] block h-[0.75px]"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, ${COLORS.dots} 0 0.75px, transparent 0.75px 2.2px)`,
        }}
      />
    </span>
  );

  const label = (text: string, underlined: boolean) => (
    <div className="text-[12px] leading-none h-[17px] flex items-start whitespace-nowrap" style={{ color: COLORS.label }}>
      {underlined ? dotted(text) : <span className="leading-none">{text}</span>}
    </div>
  );

  const swapIcon = (
    <div
      style={{
        backgroundColor: COLORS.icon,
        WebkitMaskImage: "url(/swap-icon.png)",
        maskImage: "url(/swap-icon.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        width: "19px",
        height: "19px",
      }}
      className="-translate-y-[2.5px] shrink-0"
    />
  );

  // Tag outline = a 1px border on a 200% box scaled to 50% (a true 0.5px hairline).
  // A 0.5px CSS border is rounded up to 1px by Chrome (exports came out twice as
  // thick) and the export drops inset box-shadows in Safari/iOS (outline vanished).
  // px 5px = the old 4.5px padding + 0.5px border, so the layout is unchanged.
  const tagClass =
    "relative h-[17.5px] inline-flex items-center shrink-0 whitespace-nowrap rounded-[3px] px-[5px] text-[11px] leading-none font-[370]";
  const tagStyle = { backgroundColor: COLORS.tagBg, color: COLORS.value };
  const tagOutline = (
    <span
      aria-hidden="true"
      className="absolute left-0 top-0 w-[200%] h-[200%] rounded-[6px] border border-solid pointer-events-none origin-top-left scale-50 box-border"
      style={{ borderColor: COLORS.tagBorder }}
    />
  );
  const isShort = data.positionType === "Short";

  return (
    <div
      className="pnl-card-canvas w-[480px] h-[297px] px-4 pt-[17.5px] box-border flex flex-col"
      style={{
        backgroundColor: COLORS.bg,
        fontFamily: `"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,${isZh ? ' "Noto Sans TC",' : ""} sans-serif`,
        fontFeatureSettings: '"tnum"',
        // Base weight pinned here: on the Home page the card sat inside a font-medium
        // wrapper, so every label/value inherited 500 and the preview + PNG export came
        // out ~20% bolder than the reference (the server's /isolated-card used 400).
        fontWeight: 400,
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
      data-testid="pnl-card"
      data-language={language}
      data-theme={theme}
    >
      {/* Header: side badge, symbol, tags, ADL bars */}
      <div className="flex items-center h-[17.5px] min-w-0">
        <div
          className="w-[17px] h-[17px] rounded-[3px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: isShort ? COLORS.red : COLORS.green }}
        >
          <svg width="17" height="17" viewBox="0 0 17 17" aria-label={isShort ? "S" : "B"} className="block">
            <path d={isShort ? SIDE_GLYPH.S : SIDE_GLYPH.B} fill="#ffffff" />
          </svg>
        </div>
        <span
          className="ml-[6px] text-[16px] font-[560] leading-none truncate tracking-[0.2px]"
          style={{ color: COLORS.value }}
          data-testid="text-symbol"
        >
          {data.symbol}
        </span>
        <span className={`${tagClass} ml-[2.75px]`} style={tagStyle}>
          {tagOutline}
          {data.type === "Perp" ? t.perp : t.quarterly}
        </span>
        <span className={`${tagClass} ml-[3.5px]`} style={tagStyle}>
          {tagOutline}
          {data.marginMode === "Cross" ? t.cross : t.isolated} {data.leverage}X
        </span>
        <span className="ml-[6.25px] tracking-[-0.9px] font-light text-[17px] leading-none flex shrink-0">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} style={{ color: i <= data.signalBars ? COLORS.green : COLORS.icon }}>!</span>
          ))}
        </span>
      </div>

      {/* PNL / ROI */}
      <div className="flex justify-between mt-[19px]">
        <div>
          <div className="text-[12px] leading-none h-[17px] flex items-start gap-[4.75px]" style={{ color: COLORS.label }}>
            {dotted(t.pnl)}
            <Share2
              className="shrink-0 -translate-y-[1.5px]"
              style={{ width: "15.5px", height: "15.5px", color: COLORS.icon }}
              strokeWidth={2}
              data-testid="button-share"
            />
          </div>
          <div
            className="font-[640] text-[19.5px] leading-none mt-[2.5px]"
            style={{ color: signColor(data.unrealizedPnl), ...BIG_NUMBER }}
            data-testid="text-pnl"
          >
            {renderNumber(formatSigned(data.unrealizedPnl))}
          </div>
        </div>
        <div className="flex flex-col items-end">
          {label(t.roi, true)}
          <div
            className="font-[640] text-[19.5px] leading-none mt-[2.5px]"
            style={{ color: signColor(data.roi), ...BIG_NUMBER }}
            data-testid="text-roi"
          >
            {renderNumber(formatSigned(data.roi) + "%")}
          </div>
        </div>
      </div>

      {/* Size / Margin / Margin Ratio */}
      <div className="grid grid-cols-[152.5px_1fr_auto] mt-[14px]">
        <div>
          <div className="text-[12px] leading-none h-[17px] flex items-start gap-[1.5px] whitespace-nowrap" style={{ color: COLORS.label }}>
            <span className="leading-none">{t.size(data.sizeUnit.toUpperCase())}</span>
            {swapIcon}
          </div>
          <div className="text-[14.5px] leading-none mt-[2.5px]" style={{ color: COLORS.value }} data-testid="text-size">
            {renderNumber(isZh ? formatFixed(sizeUsdt, 3) : formatPrice(data.size, sizeDecimals))}
          </div>
        </div>
        <div>
          {label(t.margin, false)}
          <div className="text-[14.5px] leading-none mt-[2.5px]" style={{ color: COLORS.value }} data-testid="text-margin">
            {renderNumber(isZh ? formatFixed(data.margin, 2) : formatPrice(data.margin))}
          </div>
        </div>
        <div className="flex flex-col items-end">
          {label(t.marginRatio, true)}
          <div className="text-[14.5px] leading-none mt-[2.5px]" style={{ color: signColor(data.marginRatio) }} data-testid="text-margin-ratio">
            {renderNumber(`${formatFixed(data.marginRatio, 2)}%`)}
          </div>
        </div>
      </div>

      {/* Entry / Mark / Liq */}
      <div className="grid grid-cols-[152.5px_1fr_auto] mt-[15px]">
        <div>
          {label(t.entryPrice, true)}
          <div className="text-[14.5px] leading-none mt-[2.5px]" style={{ color: COLORS.value }} data-testid="text-entry-price">
            {renderNumber(formatPrice(data.entryPrice, entryDecimals))}
          </div>
        </div>
        <div>
          {label(t.markPrice, false)}
          <div className="text-[14.5px] leading-none mt-[2.5px]" style={{ color: COLORS.value }} data-testid="text-mark-price">
            {renderNumber(formatPrice(data.markPrice, markDecimals))}
          </div>
        </div>
        <div className="flex flex-col items-end">
          {label(t.liqPrice, true)}
          <div className="text-[14.5px] leading-none mt-[2.5px]" style={{ color: COLORS.value }} data-testid="text-liq-price">
            {data.liqPrice <= 0 ? <span className="inline-block -mb-[5px]" style={{ fontFeatureSettings: "normal", letterSpacing: "-0.4px" }}>{dotted("--", "min-w-[12px] text-center")}</span> : renderNumber(formatPrice(data.liqPrice, liqDecimals))}
          </div>
        </div>
      </div>

      {/* Realized PNL */}
      <div
        className="mt-[10.5px] h-[34.75px] rounded-[5px] border flex items-center justify-between pl-[12px] pr-[11px] box-border"
        style={{ borderColor: COLORS.boxBorder }}
        data-testid="row-realized-pnl"
      >
        <span className="text-[12px] leading-none whitespace-nowrap" style={{ color: COLORS.label }}>
          {t.realizedPnl}
        </span>
        <span className="flex items-center gap-[4px] shrink-0 whitespace-nowrap">
          <span className="text-[12.5px] leading-none" style={{ color: signColor(realizedPnl) }} data-testid="text-realized-pnl">
            {renderNumber(formatFixed(realizedPnl, 2))}
          </span>
          <ChevronRight style={{ width: "19px", height: "19px", color: COLORS.chevron }} strokeWidth={1.75} />
        </span>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-[9px] mt-[13.5px] h-[35px]">
        {[
          { id: "button-leverage", text: t.leverage },
          { id: "button-tpsl", text: t.tpsl },
          { id: "button-close", text: t.close },
        ].map((btn) => (
          <button
            key={btn.id}
            className="font-medium rounded-[5px] text-[12.5px] whitespace-nowrap"
            style={{ backgroundColor: COLORS.button, color: COLORS.value }}
            data-testid={btn.id}
          >
            {btn.text}
          </button>
        ))}
      </div>
    </div>
  );
}
