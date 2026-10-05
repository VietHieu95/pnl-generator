import { PnlData } from "@shared/schema";
import type { ReactNode } from "react";
import { ChevronRight, Share2 } from "lucide-react";
import { calcRealizedPnl } from "@shared/realizedPnl";

export type PnlCardLanguage = "en" | "zh";

interface PnlCardProps {
  data: PnlData;
  language?: PnlCardLanguage;
}

// Sampled from a Binance app screenshot (Display P3 converted to sRGB)
const COLORS = {
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

export function PnlCard({ data, language = "en" }: PnlCardProps) {
  const isZh = language === "zh";
  const t = LABELS[language];
  // English card uses the European format (1.234,56) like the reference app; Chinese uses 1,234.56
  const locale = isZh ? "en-US" : "de-DE";

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

  const tagClass =
    "h-[17.5px] inline-flex items-center shrink-0 whitespace-nowrap rounded-[3px] border-[0.5px] px-[4.5px] text-[11px] leading-none font-normal";
  const tagStyle = { backgroundColor: COLORS.tagBg, borderColor: COLORS.tagBorder, color: COLORS.value };
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
    >
      {/* Header: side badge, symbol, tags, ADL bars */}
      <div className="flex items-center h-[17.5px] min-w-0">
        <div
          className="w-[17.5px] h-[17.5px] rounded-[3px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: isShort ? COLORS.red : COLORS.green }}
        >
          <span className="text-white text-[12.5px] font-semibold leading-none">{isShort ? "S" : "B"}</span>
        </div>
        <span
          className="ml-[5.5px] text-[16px] font-semibold leading-none truncate"
          style={{ color: COLORS.value }}
          data-testid="text-symbol"
        >
          {data.symbol}
        </span>
        <span className={`${tagClass} ml-[3px]`} style={tagStyle}>
          {data.type === "Perp" ? t.perp : t.quarterly}
        </span>
        <span className={`${tagClass} ml-[2.5px]`} style={tagStyle}>
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
