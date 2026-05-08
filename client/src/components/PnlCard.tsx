import { PnlData } from "@shared/schema";
import { Share2 } from "lucide-react";

export type PnlCardLanguage = "en" | "zh";

interface PnlCardProps {
  data: PnlData;
  language?: PnlCardLanguage;
}

export function PnlCard({ data, language = "en" }: PnlCardProps) {
  const formatNumber = (num: number, decimals: number = 1) => {
    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const formatPrice = (num: number, forceDecimals?: number) => {
    if (forceDecimals !== undefined) {
      return new Intl.NumberFormat("de-DE", {
        minimumFractionDigits: forceDecimals,
        maximumFractionDigits: forceDecimals,
      }).format(num);
    }
    const parts = num.toString().split(".");
    let decimalPlaces = parts[1]?.length || 1;
    if (decimalPlaces > 8) decimalPlaces = 8;

    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(num);
  };

  // Entry price decimals: BTC forced to 1dp, others dynamic from entry value
  const getEntryDecimals = () => {
    const base = data.symbol.toUpperCase().replace(/USDT$|BUSD$|USD$/, "");
    if (base === "BTC") return 1;
    const entryStr = data.entryPrice.toString().split(".")[1] || "";
    let dec = entryStr.length;
    if (dec < 2 && data.entryPrice >= 1) dec = 2;
    if (dec > 8) dec = 8;
    return dec;
  };

  // Mark price decimals: always from actual mark price value, no forced rounding
  const getMarkDecimals = () => {
    const markStr = data.markPrice.toString().split(".")[1] || "";
    let dec = markStr.length;
    if (dec < 1) dec = 1;
    if (dec > 8) dec = 8;
    return dec;
  };

  const entryDecimals = getEntryDecimals();
  const markDecimals = getMarkDecimals();

  const renderNumberWithStyledComma = (text: string) => {
    const numberFont = {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif'
    };
    const commaFont = {
      fontFamily: "'IBM Plex Sans', sans-serif",
      fontSize: '0.85em'
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

  const formatPnl = (pnl: number) => {
    const prefix = pnl >= 0 ? "+" : "";
    return prefix + formatNumber(pnl, 2);
  };

  const formatRoi = (roi: number) => {
    const prefix = roi >= 0 ? "+" : "";
    return prefix + formatNumber(roi, 2) + "%";
  };

  if (language === "zh") {
    const formatChineseNumber = (num: number, decimals: number = 1) => {
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(num);
    };

    const formatChinesePrice = (num: number, forceDecimals?: number) => {
      if (forceDecimals !== undefined) {
        return new Intl.NumberFormat("en-US", {
          minimumFractionDigits: forceDecimals,
          maximumFractionDigits: forceDecimals,
        }).format(num);
      }

      const parts = num.toString().split(".");
      let decimalPlaces = parts[1]?.length || 1;
      if (decimalPlaces > 8) decimalPlaces = 8;

      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(num);
    };

    const formatChinesePnl = (pnl: number) => {
      const prefix = pnl >= 0 ? "+" : "";
      return prefix + formatChineseNumber(pnl, 2);
    };

    const formatChineseRoi = (roi: number) => {
      const prefix = roi >= 0 ? "+" : "";
      return prefix + formatChineseNumber(roi, 2) + "%";
    };

    const sizeUsdt =
      data.sizeUnit.toUpperCase() === "USDT" ? data.size : data.size * data.entryPrice;
    const pnlColor = data.unrealizedPnl >= 0 ? "text-[#2bbe84]" : "text-[#f6465d]";
    const roiColor = data.roi >= 0 ? "text-[#2bbe84]" : "text-[#f6465d]";
    const ratioColor = data.marginRatio >= 0 ? "text-[#2bbe84]" : "text-[#f6465d]";
    const tagText = data.type === "Perp" ? "永續" : "季度";
    const marginText = data.marginMode === "Cross" ? "全倉" : "逐倉";
    const renderChineseUnderlinedLabel = (label: string) => (
      <span className="inline-block border-b-2 border-dotted border-[#5d6676] pb-[2px] leading-none">
        {label}
      </span>
    );
    const renderMissingLiqPrice = () => (
      <span className="inline-block border-b-2 border-dotted border-[#5d6676] pb-[3px] leading-none">
        --
      </span>
    );

    return (
      <div
        className="w-[480px] h-[280px] bg-[#202630] px-4 pt-3 pb-3 box-border"
        style={{ fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif', fontFeatureSettings: '"tnum"' }}
        data-testid="pnl-card"
        data-language="zh"
      >
        <div className="flex items-center justify-between h-7 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-[20px] h-[20px] rounded-[4px] flex items-center justify-center shrink-0 ${data.positionType === "Short" ? "bg-[#F6465D]" : "bg-[#0ECB81]"}`}>
              <span className="text-white text-[13px] font-semibold">
                {data.positionType === "Short" ? "S" : "B"}
              </span>
            </div>
            <span className="text-white text-[18px] font-normal truncate" data-testid="text-symbol">
              {data.symbol}
            </span>
            <span className="text-[12px] px-2 py-0.5 rounded border border-[#3b4656] bg-[#242b36] text-[#d8e0ea] font-normal">
              {tagText}
            </span>
            <span className="text-[12px] px-2 py-0.5 rounded border border-[#3b4656] bg-[#242b36] text-[#d8e0ea] font-normal">
              {marginText} {data.leverage}X
            </span>
            <span className="tracking-tight font-normal text-[18px] flex ml-1">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} style={{ color: i <= data.signalBars ? '#0ECB81' : '#3a3f47' }}>!</span>
              ))}
            </span>
          </div>
          <button className="text-[#848E9C] hover:text-white transition-colors shrink-0" data-testid="button-share">
            <Share2 style={{ width: '22px', height: '22px' }} />
          </button>
        </div>

        <div className="flex justify-between mb-3">
          <div>
            <div className="text-[#8d96a6] text-[14px] leading-tight">
              {renderChineseUnderlinedLabel("未實現盈虧 (USDT)")}
            </div>
            <div className={`${pnlColor} font-bold text-[20px] leading-tight mt-0.5`} data-testid="text-pnl">
              {renderNumberWithStyledComma(formatChinesePnl(data.unrealizedPnl))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[#8d96a6] text-[14px] leading-tight">
              {renderChineseUnderlinedLabel("收益率")}
            </div>
            <div className={`${roiColor} font-bold text-[20px] leading-tight mt-0.5`} data-testid="text-roi">
              {renderNumberWithStyledComma(formatChineseRoi(data.roi))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <div className="text-[#8d96a6] flex items-center gap-1 text-[14px] leading-tight">
              持倉數量 (USDT)
              <div
                style={{
                  backgroundColor: '#858e9c',
                  WebkitMaskImage: 'url(/swap-icon.png)',
                  maskImage: 'url(/swap-icon.png)',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  width: '18px',
                  height: '18px',
                  backgroundRepeat: 'no-repeat'
                }}
                className="translate-y-[1px] shrink-0"
              />
            </div>
            <div className="font-normal text-[#e8edf2] text-[16px] mt-1" data-testid="text-size">
              {renderNumberWithStyledComma(formatChinesePrice(sizeUsdt, 3))}
            </div>
          </div>
          <div>
            <div className="text-[#8d96a6] text-[14px] leading-tight">保證金 (USDT)</div>
            <div className="font-normal text-[#e8edf2] text-[16px] mt-1" data-testid="text-margin">
              {renderNumberWithStyledComma(formatChinesePrice(data.margin, 2))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[#8d96a6] text-[14px] leading-tight">
              {renderChineseUnderlinedLabel("保證金比例")}
            </div>
            <div className={`${ratioColor} font-normal text-[16px] mt-0.5`} data-testid="text-margin-ratio">
              {renderNumberWithStyledComma(`${formatChineseNumber(data.marginRatio, 2)}%`)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[#8d96a6] text-[14px] leading-tight">
              {renderChineseUnderlinedLabel("開倉價格 (USDT)")}
            </div>
            <div className="font-normal text-[#e8edf2] text-[16px] mt-0.5" data-testid="text-entry-price">
              {renderNumberWithStyledComma(formatChinesePrice(data.entryPrice, entryDecimals))}
            </div>
          </div>
          <div>
            <div className="text-[#8d96a6] text-[14px] leading-tight">標記價格 (USDT)</div>
            <div className="font-normal text-[#e8edf2] text-[16px] mt-1.5" data-testid="text-mark-price">
              {renderNumberWithStyledComma(formatChinesePrice(data.markPrice, markDecimals))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[#8d96a6] text-[14px] leading-tight">
              {renderChineseUnderlinedLabel("強平價格 (USDT)")}
            </div>
            <div className="font-normal text-[#e8edf2] text-[16px] mt-0.5" data-testid="text-liq-price">
              {data.liqPrice <= 0 ? (
                renderMissingLiqPrice()
              ) : (
                renderNumberWithStyledComma(formatChinesePrice(data.liqPrice, entryDecimals))
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-2 h-9">
          <button
            className="font-semibold rounded-lg hover:bg-[#3c4654] transition-colors text-[#edf2f7] text-[15px] bg-[#323b47]"
            data-testid="button-leverage"
          >
            槓桿
          </button>
          <button
            className="font-semibold rounded-lg hover:bg-[#3c4654] transition-colors text-[#edf2f7] text-[15px] bg-[#323b47]"
            data-testid="button-tpsl"
          >
            止盈 / 止損
          </button>
          <button
            className="font-semibold rounded-lg hover:bg-[#3c4654] transition-colors text-[#edf2f7] text-[15px] bg-[#323b47]"
            data-testid="button-close"
          >
            關閉
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-[480px] h-[280px] bg-[#202630] py-4 box-border"
      style={{ fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontFeatureSettings: '"tnum"' }}
      data-testid="pnl-card"
    >
      <div className="flex items-center justify-between mb-3 h-6 px-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-[18px] h-[18px] rounded-[3px] flex items-center justify-center ${data.positionType === "Short" ? "bg-[#F6465D]" : "bg-[#0ECB81]"}`}>
              <span className="text-white text-[13px] font-medium">
                {data.positionType === "Short" ? "S" : "B"}
              </span>
            </div>
            <span className="text-white text-[17px] font-normal" data-testid="text-symbol">
              {data.symbol}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <span className="text-xs px-1.5 py-0.5 rounded bg-[#2b3139] text-[#e6ecf3] font-normal">
              {data.type}
            </span>
            <span className="text-xs py-0.5 bg-[#2B3139] rounded text-[#e6ecf3] px-1.5 font-normal">
              {data.marginMode} {data.leverage}X
            </span>
            <span className="tracking-tight font-normal text-[17px] flex">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} style={{ color: i <= data.signalBars ? '#0ECB81' : '#3a3f47' }}>!</span>
              ))}
            </span>
          </div>
        </div>
        <button className="text-[#848E9C] hover:text-white transition-colors" data-testid="button-share">
          <Share2 style={{ width: '20px', height: '20px' }} />
        </button>
      </div>
      <div className="mb-1 px-4">
        <div className="flex justify-between">
          <div>
            <div className="text-[#848E9C] text-[12px] leading-tight">PNL (USDT)</div>
            <div className="text-[#4A5568] text-[4px] tracking-[0.5px] leading-none">•••••••••••••••••••••••••</div>
            <div className={`${data.unrealizedPnl >= 0 ? "text-[#2bbe84]" : "text-[#f6465d]"} font-bold font-sans text-[19px]`} data-testid="text-pnl">
              {renderNumberWithStyledComma(formatPnl(data.unrealizedPnl))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[#848E9C] text-[12px] leading-tight">ROI</div>
            <div className="text-[#4A5568] text-[4px] tracking-[0.5px] leading-none">••••••••</div>
            <div className={`${data.roi >= 0 ? "text-[#2bbe84]" : "text-[#f6465d]"} font-bold font-sans text-[19px]`} data-testid="text-roi">
              {renderNumberWithStyledComma(formatRoi(data.roi))}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-1 px-4 mt-2">
        <div>
          <div className="text-[#848E9C] flex items-center gap-1 text-[12px] leading-tight">
            Size ({data.sizeUnit.toUpperCase()})
            <div
              style={{
                backgroundColor: '#858e9c',
                WebkitMaskImage: 'url(/swap-icon.png)',
                maskImage: 'url(/swap-icon.png)',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                width: '19px',
                height: '19px',
                backgroundRepeat: 'no-repeat'
              }}
              className="ml-0 translate-y-[1px]"
            />
          </div>
          <div className="font-normal text-[#e8edf2] text-[15px] mt-0.5" data-testid="text-size">
            {renderNumberWithStyledComma(formatPrice(data.size))}
          </div>
        </div>
        <div>
          <div className="text-[#848E9C] text-[12px] leading-tight">Margin (USDT)</div>
          <div className="font-normal text-[#e8edf2] text-[15px] mt-0.5" data-testid="text-margin">
            {renderNumberWithStyledComma(formatPrice(data.margin))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[#848E9C] text-[12px] leading-tight">Margin Ratio</div>
          <div className="text-[#4A5568] text-[4px] tracking-[0.5px] leading-none">••••••••••••••••••••••••••</div>
          <div className="font-normal text-[#3aba8b] text-[15px]" data-testid="text-margin-ratio">
            {renderNumberWithStyledComma(formatNumber(data.marginRatio, 2))}%
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 px-4 mt-1">
        <div>
          <div className="text-[#848E9C] text-[12px] leading-tight">Entry Price (USDT)</div>
          <div className="text-[#4A5568] text-[4px] tracking-[0.5px] leading-none">•••••••••••••••••••••••••••••••••••••••••</div>
          <div className="font-normal text-[#e8edf2] text-[15px]" data-testid="text-entry-price">
            {renderNumberWithStyledComma(formatPrice(data.entryPrice, entryDecimals))}
          </div>
        </div>
        <div>
          <div className="text-[#848E9C] text-[12px] leading-tight">Mark Price (USDT)</div>
          <div className="font-normal text-[#e8edf2] text-[15px] mt-1" data-testid="text-mark-price">
            {renderNumberWithStyledComma(formatPrice(data.markPrice, markDecimals))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[#848E9C] text-[12px] leading-tight">Liq.Price (USDT)</div>
          <div className="text-[#4A5568] text-[4px] tracking-[0.5px] leading-none">••••••••••••••••••••••••••••••••••••</div>
          <div className="font-normal text-[#e8edf2] text-[15px]" data-testid="text-liq-price">
            {data.liqPrice <= 0 ? (
              <div className="flex flex-col items-end">
                <span>--</span>
                <div className="text-[#4A5568] text-[4px] tracking-[0.5px] leading-none mt-[1px]">••••••••</div>
              </div>
            ) : (
              renderNumberWithStyledComma(formatPrice(data.liqPrice, entryDecimals))
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 h-9 px-4">
        <button
          className="font-medium rounded-lg hover:bg-[#363C45] transition-colors text-[#e6ecf3] text-[12px] bg-[#323b47]"
          data-testid="button-leverage"
        >
          Leverage
        </button>
        <button
          className="font-medium rounded-lg hover:bg-[#363C45] transition-colors text-[#e6ecf3] text-[12px] bg-[#323b47]"
          data-testid="button-tpsl"
        >
          TP/SL
        </button>
        <button
          className="font-medium rounded-lg hover:bg-[#363C45] transition-colors text-[#e6ecf3] text-[12px] bg-[#323b47]"
          data-testid="button-close"
        >
          Close
        </button>
      </div>

    </div>
  );
}
