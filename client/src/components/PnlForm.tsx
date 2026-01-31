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

  const presets = [
    { label: "Profit +50%", pnl: 1500, roi: 50 },
    { label: "Profit +100%", pnl: 3000, roi: 100 },
    { label: "Loss -30%", pnl: -900, roi: -30 },
    { label: "Loss -50%", pnl: -1500, roi: -50 },
  ];

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
              const newSymbol = e.target.value;
              let newUnit = data.sizeUnit;
              if (newSymbol.toUpperCase().endsWith("USDT")) {
                newUnit = newSymbol.toUpperCase().replace("USDT", "");
              } else if (newSymbol.toUpperCase().endsWith("BUSD")) {
                newUnit = newSymbol.toUpperCase().replace("BUSD", "");
              }
              onChange({ ...data, symbol: newSymbol, sizeUnit: newUnit });
            }}
            className="h-9 bg-white/5 border-white/5 focus:border-primary/50 text-sm font-bold"
          />
        </div>

        <div className="space-y-1.5 min-w-0">
          <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-tight ml-1">Size Unit</Label>
          <Input
            value={data.sizeUnit}
            placeholder="BTC"
            onChange={(e) => handleFieldChange("sizeUnit", e.target.value)}
            className="h-9 bg-white/5 border-white/5 focus:border-primary/50 text-sm font-bold uppercase"
          />
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

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Growth Presets</h4>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => onChange({ ...data, unrealizedPnl: preset.pnl, roi: preset.roi })}
              className={`h-8 text-[9px] font-black border-white/5 bg-white/3 hover:border-primary/50 hover:bg-primary/5 transition-all px-0 ${preset.label.includes('+') ? 'text-green-500' : 'text-red-500'
                }`}
            >
              {preset.label.replace('Profit ', '').replace('Loss ', '')}
            </Button>
          ))}
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
          { id: "size", label: "Position Size" },
          { id: "margin", label: "Initial Margin" },
          { id: "liqPrice", label: "Liq. Price" },
          { id: "marginRatio", label: "Margin Ratio" },
        ].map((field) => (
          <div key={field.id} className="space-y-1">
            <Label className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter flex justify-between ml-1">
              {field.label}
              {["unrealizedPnl", "roi", "margin", "liqPrice", "marginRatio"].includes(field.id) &&
                <span className="text-[7px] bg-white/10 px-1 rounded uppercase font-black text-primary/60">Auto</span>
              }
            </Label>
            <Input
              type="number"
              value={data[field.id as keyof PnlData] ?? ''}
              onChange={(e) => {
                // Only allow editing for 'size' field
                if (field.id === 'size') {
                  handleNumberChange(field.id, e.target.value);
                }
              }}
              disabled={["unrealizedPnl", "roi", "margin", "liqPrice", "marginRatio"].includes(field.id)}
              className={`h-7 bg-transparent border-transparent text-[11px] font-bold p-0 px-1 ${field.id === 'size'
                  ? 'cursor-text hover:bg-white/5 focus:bg-white/10'
                  : 'disabled:opacity-80 cursor-not-allowed'
                }`}
              readOnly={field.id !== 'size'}
            />
          </div>
        ))}
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
