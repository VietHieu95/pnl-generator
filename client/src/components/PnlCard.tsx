import { PnlData } from "@shared/schema";
import { Share2 } from "lucide-react";

interface PnlCardProps {
  data: PnlData;
}

export function PnlCard({ data }: PnlCardProps) {
  const formatNumber = (num: number, decimals: number = 1) => {
    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const formatPrice = (num: number) => {
    const parts = num.toString().split(".");
    let decimalPlaces = parts[1]?.length || 1;
    if (num > 1 && decimalPlaces > 2) decimalPlaces = 2;

    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(num);
  };

  const renderNumberWithStyledComma = (text: string) => {
    const parts = text.split(",");
    if (parts.length === 2) {
      return (
        <>
          <span style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif' }}>{parts[0]}</span>
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.85em' }}>,</span>
          <span style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif' }}>{parts[1]}</span>
        </>
      );
    }
    return <span style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif' }}>{text}</span>;
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
            Size ({data.sizeUnit})
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
                height: '19px'
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
            {renderNumberWithStyledComma(formatPrice(data.entryPrice))}
          </div>
        </div>
        <div>
          <div className="text-[#848E9C] text-[12px] leading-tight">Mark Price (USDT)</div>
          <div className="font-normal text-[#e8edf2] text-[15px] mt-1" data-testid="text-mark-price">
            {renderNumberWithStyledComma(formatPrice(data.markPrice))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[#848E9C] text-[12px] leading-tight">Liq.Price (USDT)</div>
          <div className="text-[#4A5568] text-[4px] tracking-[0.5px] leading-none">••••••••••••••••••••••••••••••••••••</div>
          <div className="font-normal text-[#e8edf2] text-[15px]" data-testid="text-liq-price">
            {renderNumberWithStyledComma(formatPrice(data.liqPrice))}
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
