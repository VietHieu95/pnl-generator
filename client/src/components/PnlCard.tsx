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
  green: "#2ebd85",
  red: "#f6465d",
  icon: "#737a87",
  chevron: "#949da8",
  dots: "#70757f",
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

const DOT_LINE = "••••••••••••••••••••••••••••••••••••••••••••••••";

// Side-badge letters as Inter SemiBold outlines (12.5px), pre-centred in the 17.5px
// badge. Text there depends on each browser's font metrics, and the Safari/iOS export
// put S/B ~1px off; a path renders identically everywhere.
const SIDE_GLYPH = {
  S: "M8.79 13.43Q7.74 13.43 6.96 13.1Q6.18 12.77 5.74 12.14Q5.3 11.51 5.27 10.61H6.87Q6.91 11.09 7.17 11.41Q7.43 11.72 7.85 11.88Q8.27 12.04 8.78 12.04Q9.32 12.04 9.73 11.87Q10.14 11.71 10.37 11.41Q10.61 11.11 10.61 10.72Q10.61 10.37 10.4 10.14Q10.2 9.9 9.83 9.74Q9.46 9.58 8.96 9.46L7.93 9.19Q6.79 8.9 6.15 8.31Q5.51 7.71 5.51 6.75Q5.51 5.95 5.95 5.34Q6.38 4.74 7.13 4.41Q7.88 4.07 8.84 4.07Q9.81 4.07 10.54 4.41Q11.27 4.74 11.68 5.33Q12.09 5.92 12.11 6.69H10.53Q10.47 6.1 10.01 5.78Q9.55 5.46 8.81 5.46Q8.3 5.46 7.93 5.61Q7.56 5.77 7.36 6.04Q7.16 6.31 7.16 6.65Q7.16 7.03 7.4 7.28Q7.63 7.52 7.99 7.67Q8.35 7.81 8.71 7.91L9.56 8.12Q10.07 8.24 10.54 8.45Q11.02 8.65 11.4 8.96Q11.79 9.27 12.01 9.7Q12.23 10.14 12.23 10.73Q12.23 11.53 11.83 12.14Q11.42 12.75 10.65 13.09Q9.88 13.43 8.79 13.43Z",
  B: "M5.37 13.3V4.2H8.85Q9.83 4.2 10.48 4.51Q11.13 4.82 11.46 5.36Q11.78 5.89 11.78 6.56Q11.78 7.12 11.57 7.51Q11.36 7.91 11 8.15Q10.64 8.39 10.19 8.5V8.59Q10.68 8.61 11.12 8.88Q11.57 9.15 11.85 9.64Q12.13 10.13 12.13 10.82Q12.13 11.52 11.79 12.09Q11.45 12.65 10.77 12.97Q10.08 13.3 9.04 13.3ZM7 11.93H8.78Q9.68 11.93 10.08 11.59Q10.48 11.24 10.48 10.7Q10.48 10.29 10.28 9.96Q10.08 9.64 9.71 9.44Q9.34 9.25 8.83 9.25H7ZM7 8.08H8.64Q9.07 8.08 9.41 7.92Q9.76 7.76 9.96 7.47Q10.15 7.17 10.15 6.77Q10.15 6.24 9.78 5.9Q9.41 5.56 8.68 5.56H7Z",
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
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif',
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

  const dotted = (content: ReactNode, className = "") => (
    <span className={`relative inline-block whitespace-nowrap pb-[5px] leading-none ${className}`}>
      <span>{content}</span>
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 block overflow-hidden whitespace-nowrap text-[4px] tracking-[0.5px] leading-none"
        style={{ color: COLORS.dots }}
      >
        {DOT_LINE}
      </span>
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
    "relative h-[17.5px] inline-flex items-center shrink-0 whitespace-nowrap rounded-[3px] px-[5px] text-[11px] leading-none font-normal";
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
      }}
      data-testid="pnl-card"
      data-language={language}
      data-theme={theme}
    >
      {/* Header: side badge, symbol, tags, ADL bars */}
      <div className="flex items-center h-[17.5px] min-w-0">
        <div
          className="w-[17.5px] h-[17.5px] rounded-[3px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: isShort ? COLORS.red : COLORS.green }}
        >
          <svg width="17.5" height="17.5" viewBox="0 0 17.5 17.5" aria-label={isShort ? "S" : "B"} className="block">
            <path d={isShort ? SIDE_GLYPH.S : SIDE_GLYPH.B} fill="#ffffff" />
          </svg>
        </div>
        <span
          className="ml-[5.5px] text-[16px] font-semibold leading-none truncate"
          style={{ color: COLORS.value }}
          data-testid="text-symbol"
        >
          {data.symbol}
        </span>
        <span className={`${tagClass} ml-[3px]`} style={tagStyle}>
          {tagOutline}
          {data.type === "Perp" ? t.perp : t.quarterly}
        </span>
        <span className={`${tagClass} ml-[2.5px]`} style={tagStyle}>
          {tagOutline}
          {data.marginMode === "Cross" ? t.cross : t.isolated} {data.leverage}X
        </span>
        <span className="ml-[5px] tracking-[-0.5px] font-light text-[17px] leading-none flex shrink-0">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} style={{ color: i <= data.signalBars ? COLORS.green : COLORS.icon }}>!</span>
          ))}
        </span>
      </div>

      {/* PNL / ROI */}
      <div className="flex justify-between mt-[19px]">
        <div>
          <div className="text-[12px] leading-none h-[17px] flex items-start gap-[6px]" style={{ color: COLORS.label }}>
            {dotted(t.pnl)}
            <Share2
              className="shrink-0 -translate-y-[1.5px]"
              style={{ width: "14px", height: "14px", color: COLORS.icon }}
              strokeWidth={2}
              data-testid="button-share"
            />
          </div>
          <div
            className="font-bold text-[18px] leading-none mt-[3px]"
            style={{ color: signColor(data.unrealizedPnl) }}
            data-testid="text-pnl"
          >
            {renderNumber(formatSigned(data.unrealizedPnl))}
          </div>
        </div>
        <div className="flex flex-col items-end">
          {label(t.roi, true)}
          <div
            className="font-bold text-[18px] leading-none mt-[3px]"
            style={{ color: signColor(data.roi) }}
            data-testid="text-roi"
          >
            {renderNumber(formatSigned(data.roi) + "%")}
          </div>
        </div>
      </div>

      {/* Size / Margin / Margin Ratio */}
      <div className="grid grid-cols-[152.5px_1fr_auto] mt-[16px]">
        <div>
          <div className="text-[12px] leading-none h-[17px] flex items-start gap-[4px] whitespace-nowrap" style={{ color: COLORS.label }}>
            <span className="leading-none">{t.size(data.sizeUnit.toUpperCase())}</span>
            {swapIcon}
          </div>
          <div className="text-[14.5px] leading-none mt-[2.5px]" style={{ color: COLORS.value }} data-testid="text-size">
            {renderNumber(isZh ? formatFixed(sizeUsdt, 3) : formatPrice(data.size))}
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
      <div className="grid grid-cols-[152.5px_1fr_auto] mt-[14px]">
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
            {data.liqPrice <= 0 ? dotted("--", "min-w-[22px] text-center") : renderNumber(formatPrice(data.liqPrice, liqDecimals))}
          </div>
        </div>
      </div>

      {/* Realized PNL */}
      <div
        className="mt-[12px] h-[33.5px] rounded-[5px] border flex items-center justify-between pl-[13px] pr-[11px] box-border"
        style={{ borderColor: COLORS.boxBorder }}
        data-testid="row-realized-pnl"
      >
        <span className="text-[12px] leading-none whitespace-nowrap" style={{ color: COLORS.label }}>
          {t.realizedPnl}
        </span>
        <span className="flex items-center gap-[5px] shrink-0 whitespace-nowrap">
          <span className="text-[12.5px] leading-none" style={{ color: signColor(realizedPnl) }} data-testid="text-realized-pnl">
            {renderNumber(formatFixed(realizedPnl, 2))}
          </span>
          <ChevronRight style={{ width: "19px", height: "19px", color: COLORS.chevron }} strokeWidth={1.75} />
        </span>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-[9px] mt-[15px] h-[34px]">
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
