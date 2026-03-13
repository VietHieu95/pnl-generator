import { PnlData } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface PnlFormProps {
  data: PnlData;
  onChange: (data: PnlData) => void;
  isLive?: boolean;
}

export function PnlForm({ data, onChange, isLive = false }: PnlFormProps) {
  const handleFieldChange = (field: keyof PnlData, value: string | number) => {
    const newData = { ...data, [field]: value };
    onChange(newData);
  };

  const handleNumberChange = (field: keyof PnlData, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      handleFieldChange(field, numValue);
    }
  };



  return (
    <div className="w-full overflow-hidden space-y-4 p-3 md:p-5 bg-white/2 rounded-2xl border border-white/5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Position Settings</h3>
        <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">MODE: {data.type}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full min-w-0">
        <div className="space-y-1.5 min-w-0">
          <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-tight ml-1">Symbol</Label>
          <Input
            value={data.symbol}
            onChange={(e) => {
              const newSymbol = e.target.value.toUpperCase();
              let newUnit = data.sizeUnit;
              if (newSymbol.endsWith("USDT")) {
                newUnit = newSymbol.replace("USDT", "");
              } else if (newSymbol.endsWith("BUSD")) {
                newUnit = newSymbol.replace("BUSD", "");
              }
              onChange({ ...data, symbol: newSymbol, sizeUnit: newUnit });
            }}
            className="h-9 bg-white/5 border-white/5 focus:border-primary/50 text-sm font-bold"
          />
        </div>

        <div className="space-y-1.5 min-w-0">
          <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-tight ml-1">
            Size Unit
          </Label>
          <div className="flex gap-1.5 items-stretch">
            <Input
              value={data.sizeUnit.toUpperCase()}
              placeholder="BTC"
              readOnly={data.sizeUnit.toUpperCase() === 'USDT'}
              onChange={(e) => {
                if (data.sizeUnit.toUpperCase() !== 'USDT') {
                  handleFieldChange("sizeUnit", e.target.value);
                }
              }}
              className={`h-9 border-white/5 text-sm font-bold uppercase flex-1 min-w-0 ${
                data.sizeUnit.toUpperCase() === 'USDT'
                  ? 'bg-primary/10 border-primary/30 text-primary cursor-default'
                  : 'bg-white/5 focus:border-primary/50'
              }`}
            />
            <button
              type="button"
              onClick={() => {
                const currentUnit = data.sizeUnit.toUpperCase();
                if (currentUnit === 'USDT') {
                  const newUnit = data.symbol.replace("USDT", "").replace("BUSD", "") || "BTC";
                  onChange({ ...data, sizeUnit: newUnit, size: Number((data.size / data.entryPrice).toFixed(4)) });
                } else {
                  onChange({ ...data, sizeUnit: 'USDT', size: Number((data.size * data.entryPrice).toFixed(2)) });
                }
              }}
              className={`h-9 px-3 rounded-lg text-[10px] font-black tracking-wider transition-all duration-200 flex items-center gap-1 shrink-0 border ${
                data.sizeUnit.toUpperCase() === 'USDT'
                  ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_12px_rgba(243,186,47,0.35)]'
                  : 'bg-white/8 border-white/10 text-white/60 hover:bg-white/15 hover:text-white active:scale-95'
              }`}
            >
              ⇆ USDT
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 w-full min-w-0">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-tight ml-1">Margin</Label>
          <Select value={data.marginMode} onValueChange={(v) => handleFieldChange("marginMode", v as any)}>
            <SelectTrigger className="h-9 bg-white/5 border-white/5 text-[10px] font-bold px-2 focus:ring-primary/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1E2329] border-white/10">
              <SelectItem value="Cross">Cross</SelectItem>
              <SelectItem value="Isolated">Isolated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-tight ml-1">Side</Label>
          <Select value={data.positionType} onValueChange={(v) => handleFieldChange("positionType", v as any)}>
            <SelectTrigger className={`h-9 border-white/5 text-[10px] font-bold px-2 focus:ring-primary/20 ${data.positionType === 'Long' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1E2329] border-white/10">
              <SelectItem value="Long">Long</SelectItem>
              <SelectItem value="Short">Short</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-tight ml-1">Bars</Label>
          <Input
            type="number"
            value={data.signalBars}
            onChange={(e) => handleNumberChange("signalBars", e.target.value)}
            className="h-9 bg-white/5 border-white/5 text-center font-bold text-xs"
          />
        </div>
      </div>


      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/5 pt-4 w-full min-w-0">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase flex justify-between items-center ml-1">
            Leverage
            <span className="text-[8px] bg-primary/10 text-primary px-1 rounded">MAX 125X</span>
          </Label>
          <Input
            type="number"
            value={data.leverage}
            onChange={(e) => handleNumberChange("leverage", e.target.value)}
            className="h-10 bg-white/5 border-white/5 focus:border-primary/40 font-black text-lg p-0 text-center"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-primary uppercase ml-1">Wallet Balance</Label>
          <Input
            type="number"
            value={data.walletBalance}
            onChange={(e) => handleNumberChange("walletBalance", e.target.value)}
            className="h-10 bg-primary/5 border-primary/20 focus:border-primary/50 font-black text-lg p-0 text-center text-primary"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Entry Price</Label>
          <Input
            type="number"
            value={data.entryPrice}
            onChange={(e) => handleNumberChange("entryPrice", e.target.value)}
            className="h-10 bg-white/5 border-white/5 font-black text-center"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase flex justify-between ml-1">
            Mark Price
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mt-1" />}
          </Label>
          <Input
            type="number"
            value={data.markPrice}
            disabled={isLive}
            onChange={(e) => handleNumberChange("markPrice", e.target.value)}
            className={`h-10 font-black text-center ${isLive ? 'bg-white/2 border-dashed opacity-50' : 'bg-white/5 border-white/5'}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4 w-full min-w-0">
        {[
          { id: "unrealizedPnl", label: "Unrealized PNL" },
          { id: "roi", label: "ROI (%)" },
          // Always show the base coin label (e.g. BTC), even if sizeUnit is USDT
          { id: "size", label: `Size (${data.sizeUnit.toUpperCase() === 'USDT' ? (data.symbol.replace('USDT','').replace('BUSD','') || 'Coin') : data.sizeUnit.toUpperCase()})` },
          { id: "sizeUsdt", label: "Size (USDT)" },
          { id: "margin", label: "Initial Margin" },
          { id: "liqPrice", label: "Liq. Price" },
          { id: "marginRatio", label: "Margin Ratio" },
        ].map((field) => {
          let value: string | number = '';
          if (field.id === 'sizeUsdt') {
            // Always compute the USDT equivalent regardless of current sizeUnit
            value = data.sizeUnit.toUpperCase() === 'USDT'
              ? data.size
              : Number((data.size * data.entryPrice).toFixed(2));
          } else if (field.id === 'size') {
            // If sizeUnit is USDT, derive approximate coin amount for display
            value = data.sizeUnit.toUpperCase() === 'USDT'
              ? Number((data.size / data.entryPrice).toFixed(4))
              : data.size;
          } else {
            value = data[field.id as keyof PnlData] ?? '';
          }
          
          const isEditable = field.id === 'size' || field.id === 'sizeUsdt';

          return (
          <div key={field.id} className="space-y-1">
            <Label className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter flex justify-between ml-1">
              {field.label}
              {!isEditable &&
                <span className="text-[7px] bg-white/10 px-1 rounded uppercase font-black text-primary/60">Auto</span>
              }
            </Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (field.id === 'size') {
                  handleNumberChange(field.id, e.target.value);
                } else if (field.id === 'sizeUsdt') {
                  if (!isNaN(val)) {
                    if (data.sizeUnit.toUpperCase() === 'USDT') {
                      handleFieldChange('size', val);
                    } else {
                      handleFieldChange('size', Number((val / data.entryPrice).toFixed(4)));
                    }
                  } else {
                    handleFieldChange('size', 0);
                  }
                }
              }}
              disabled={!isEditable}
              className={`h-7 bg-transparent border-transparent text-[11px] font-bold p-0 px-1 ${isEditable
                ? 'cursor-text hover:bg-white/5 focus:bg-white/10'
                : 'disabled:opacity-80 cursor-not-allowed'
                }`}
              readOnly={!isEditable}
            />
          </div>
        )})}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4 pb-2 w-full min-w-0">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-muted-foreground/60 uppercase ml-1">Take Profit</Label>
          <Input
            value={data.tpPrice}
            onChange={(e) => handleFieldChange("tpPrice", e.target.value)}
            className="h-9 bg-white/2 border-white/5 text-xs text-center font-bold text-green-500/80"
            placeholder="--"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-muted-foreground/60 uppercase ml-1">Stop Loss</Label>
          <Input
            value={data.slPrice}
            onChange={(e) => handleFieldChange("slPrice", e.target.value)}
            className="h-9 bg-white/2 border-white/5 text-xs text-center font-bold text-red-500/80"
            placeholder="--"
          />
        </div>
      </div>
    </div>
  );
}
