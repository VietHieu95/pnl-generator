import { PnlData } from "@shared/schema";
import { Share2 } from "lucide-react";

interface PnlCardProps {
  data: PnlData;
}

export function PnlCard({ data }: PnlCardProps) {
  const formatNumber = (num: number, decimals: number = 1) => {
    const formatted = num.toLocaleString("de-DE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return formatted;
  };

  const formatPrice = (num: number) => {
    const parts = num.toString().split(".");
    let decimalPlaces = parts[1]?.length || 1;
    // Cap decimal places at 2 for prices > 1 to match common trading UI
    if (num > 1 && decimalPlaces > 2) decimalPlaces = 2;

    const formatted = num.toLocaleString("de-DE", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
    return formatted;
  };

  const renderNumberWithStyledComma = (text: string) => {
    const parts = text.split(",");
    if (parts.length === 2) {
      return (
        <span className="inline-flex items-baseline">
          <span className="font-semibold">{parts[0]}</span>
          <span className="font-normal text-[0.8em] mx-[1px]">,</span>
          <span className="font-semibold">{parts[1]}</span>
        </span>
      );
    }
    return <span className="font-semibold">{text}</span>;
  };

  const formatPnl = (pnl: number) => {
    const prefix = pnl >= 0 ? "+" : "";
    return prefix + formatNumber(pnl, 2);
  };

  const formatRoi = (roi: number) => {
    const prefix = roi >= 0 ? "+" : "";
    return prefix + formatNumber(roi, 2) + "%";
  };

  return (
    <div
      className="w-[480px] h-[280px] bg-[#1E2329] py-4 box-border relative overflow-hidden"
      style={{ fontFamily: '"Inter", sans-serif', fontFeatureSettings: '"tnum" 1' }}
      data-testid="pnl-card"
    >
      <div className="flex items-center justify-between mb-4 h-6 px-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 slice-badge">
            <div className={`w-[18px] h-[18px] rounded-[3px] flex items-center justify-center ${data.positionType === "Short" ? "bg-[#F6465D]" : "bg-[#0ECB81]"}`}>
              <span className="text-white text-[12px] font-bold">
                {data.positionType === "Short" ? "S" : "B"}
              </span>
            </div>
            <span className="text-[#EAECEF] text-[16px] font-bold tracking-tight" data-testid="text-symbol">
              {data.symbol}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] px-1.5 py-0.5 rounded-[2px] bg-[#2B3139] text-[#929AA5] font-medium">
              {data.type}
            </span>
            <span className="text-[11px] py-0.5 bg-[#2B3139] rounded-[2px] text-[#F0B90B] px-1.5 font-medium">
              {data.marginMode} {data.leverage}X
            </span>
            <span className="tracking-[-2px] font-bold text-[18px] flex ml-0.5">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} style={{ color: i <= data.signalBars ? '#0ECB81' : '#3a3f47' }}>!</span>
              ))}
            </span>
          </div>
        </div>
        <button className="text-[#848E9C]" data-testid="button-share">
          <Share2 size={18} />
        </button>
      </div>

      <div className="mb-2 px-4">
        <div className="flex justify-between">
          <div className="flex-1">
            <div className="text-[#848E9C] text-[12px] font-medium mb-0.5">PNL (USDT)</div>
            <div className="text-[#4A5568] text-[2px] tracking-[2px] mb-1 opacity-40 uppercase">••••••••••••••••••••••••••••••••••••••••</div>
            <div className={`${data.unrealizedPnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"} text-[24px] leading-tight`} data-testid="text-pnl">
              {renderNumberWithStyledComma(formatPnl(data.unrealizedPnl))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[#848E9C] text-[12px] font-medium mb-0.5">ROI</div>
            <div className="text-[#4A5568] text-[2px] tracking-[2px] mb-1 opacity-40 uppercase">•••••••••••••</div>
            <div className={`${data.roi >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"} text-[24px] leading-tight`} data-testid="text-roi">
              {renderNumberWithStyledComma(formatRoi(data.roi))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-3 px-4 mt-4">
        <div>
          <div className="text-[#848E9C] text-[11px] font-medium flex items-center gap-1 mb-1">
            Size ({data.sizeUnit})
            <div className="w-[14px] h-[14px] bg-[#848E9C]" style={{ maskImage: 'url(/swap-icon.png)', maskSize: 'contain', maskRepeat: 'no-repeat' }} />
          </div>
          <div className="font-semibold text-[#EAECEF] text-[14px]" data-testid="text-size">
            {renderNumberWithStyledComma(formatPrice(data.size))}
          </div>
        </div>
        <div>
          <div className="text-[#848E9C] text-[11px] font-medium mb-1">Margin (USDT)</div>
          <div className="font-semibold text-[#EAECEF] text-[14px]" data-testid="text-margin">
            {renderNumberWithStyledComma(formatPrice(data.margin))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[#848E9C] text-[11px] font-medium mb-1">Margin Ratio</div>
          <div className="font-semibold text-[#0ECB81] text-[14px]" data-testid="text-margin-ratio">
            {formatNumber(data.marginRatio, 2)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 px-4">
        <div>
          <div className="text-[#848E9C] text-[11px] font-medium mb-1">Entry Price</div>
          <div className="font-semibold text-[#EAECEF] text-[14px]" data-testid="text-entry-price">
            {formatPrice(data.entryPrice)}
          </div>
        </div>
        <div>
          <div className="text-[#848E9C] text-[11px] font-medium mb-1">Mark Price</div>
          <div className="font-semibold text-[#EAECEF] text-[14px]" data-testid="text-mark-price">
            {formatPrice(data.markPrice)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[#848E9C] text-[11px] font-medium mb-1">Liq.Price</div>
          <div className="font-semibold text-[#EAECEF] text-[14px]" data-testid="text-liq-price">
            {formatPrice(data.liqPrice)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 h-8 px-4">
        <div className="flex items-center justify-center rounded-[4px] text-[#EAECEF] text-[11px] bg-[#2B3139] font-medium uppercase tracking-tight">
          Leverage
        </div>
        <div className="flex items-center justify-center rounded-[4px] text-[#EAECEF] text-[11px] bg-[#2B3139] font-medium uppercase tracking-tight">
          TP/SL
        </div>
        <div className="flex items-center justify-center rounded-[4px] text-[#EAECEF] text-[11px] bg-[#2B3139] font-medium uppercase tracking-tight">
          Close
        </div>
      </div>
    </div>
  );
}
