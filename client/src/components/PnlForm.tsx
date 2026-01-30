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
    <div className="space-y-4 p-4 bg-card rounded-lg border border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">Position Settings</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="symbol" className="text-muted-foreground text-sm">Symbol</Label>
          <Input
            id="symbol"
            data-testid="input-symbol"
            value={data.symbol}
            onChange={(e) => {
              const newSymbol = e.target.value;
              let newUnit = data.sizeUnit;

              // Automatically detect unit if it ends with USDT or similar common patterns
              if (newSymbol.toUpperCase().endsWith("USDT")) {
                newUnit = newSymbol.toUpperCase().replace("USDT", "");
              } else if (newSymbol.toUpperCase().endsWith("BUSD")) {
                newUnit = newSymbol.toUpperCase().replace("BUSD", "");
              }

              onChange({ ...data, symbol: newSymbol, sizeUnit: newUnit });
            }}
            className="bg-muted border-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sizeUnit" className="text-muted-foreground text-sm">Size Unit</Label>
          <Input
            id="sizeUnit"
            data-testid="input-size-unit"
            value={data.sizeUnit}
            onChange={(e) => handleFieldChange("sizeUnit", e.target.value)}
            className="bg-muted border-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Type</Label>
          <Select
            value={data.type}
            onValueChange={(value) => handleFieldChange("type", value as "Perp" | "Quarterly")}
          >
            <SelectTrigger className="bg-muted border-input" data-testid="select-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Perp">Perp</SelectItem>
              <SelectItem value="Quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Margin Mode</Label>
          <Select
            value={data.marginMode}
            onValueChange={(value) => handleFieldChange("marginMode", value as "Cross" | "Isolated")}
          >
            <SelectTrigger className="bg-muted border-input" data-testid="select-margin-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Cross">Cross</SelectItem>
              <SelectItem value="Isolated">Isolated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Position</Label>
          <Select
            value={data.positionType}
            onValueChange={(value) => handleFieldChange("positionType", value as "Long" | "Short")}
          >
            <SelectTrigger className="bg-muted border-input" data-testid="select-position-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Long">Long</SelectItem>
              <SelectItem value="Short">Short</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="leverage" className="text-muted-foreground text-sm">Leverage (1-125x)</Label>
          <Input
            id="leverage"
            data-testid="input-leverage"
            type="number"
            min="1"
            max="125"
            value={data.leverage}
            onChange={(e) => handleNumberChange("leverage", e.target.value)}
            className="bg-muted border-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signalBars" className="text-muted-foreground text-sm">Signal Bars (0-4)</Label>
          <Input
            id="signalBars"
            data-testid="input-signal-bars"
            type="number"
            min="0"
            max="4"
            value={data.signalBars}
            onChange={(e) => handleNumberChange("signalBars", e.target.value)}
            className="bg-muted border-input"
          />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-medium text-foreground mb-3">PNL & ROI</h4>
        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              data-testid={`button-preset-${preset.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
              onClick={() => {
                onChange({ ...data, unrealizedPnl: preset.pnl, roi: preset.roi });
              }}
              className="text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="unrealizedPnl" className="text-muted-foreground text-sm">Unrealized PNL (USDT)</Label>
            <Input
              id="unrealizedPnl"
              data-testid="input-pnl"
              type="number"
              step="0.01"
              value={data.unrealizedPnl}
              onChange={(e) => handleNumberChange("unrealizedPnl", e.target.value)}
              className="bg-muted border-input"
              disabled={isLive}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="roi" className="text-muted-foreground text-sm">ROI (%)</Label>
            <Input
              id="roi"
              data-testid="input-roi"
              type="number"
              step="0.01"
              value={data.roi}
              onChange={(e) => handleNumberChange("roi", e.target.value)}
              className="bg-muted border-input"
              disabled={isLive}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Position Details</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="size" className="text-muted-foreground text-sm">Size</Label>
            <Input
              id="size"
              data-testid="input-size"
              type="number"
              step="0.001"
              value={data.size}
              onChange={(e) => handleNumberChange("size", e.target.value)}
              className="bg-muted border-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="margin" className="text-muted-foreground text-sm">Margin (USDT)</Label>
            <Input
              id="margin"
              data-testid="input-margin"
              type="number"
              step="0.01"
              value={data.margin}
              onChange={(e) => handleNumberChange("margin", e.target.value)}
              className="bg-muted border-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marginRatio" className="text-muted-foreground text-sm">Margin Ratio (%)</Label>
            <Input
              id="marginRatio"
              data-testid="input-margin-ratio"
              type="number"
              step="0.01"
              value={data.marginRatio}
              onChange={(e) => handleNumberChange("marginRatio", e.target.value)}
              className="bg-muted border-input"
            />
          </div>

          <div className="space-y-2 text-primary">
            <Label htmlFor="walletBalance" className="text-sm font-bold">Wallet Balance (Capital)</Label>
            <Input
              id="walletBalance"
              data-testid="input-wallet-balance"
              type="number"
              step="0.01"
              value={data.walletBalance}
              onChange={(e) => handleNumberChange("walletBalance", e.target.value)}
              className="bg-muted border-primary/30 border-2 font-bold"
            />
            <p className="text-[10px] text-muted-foreground">Used for automatic Margin Ratio calculation</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Price Information</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="entryPrice" className="text-muted-foreground text-sm">Entry Price (USDT)</Label>
            <Input
              id="entryPrice"
              data-testid="input-entry-price"
              type="number"
              step="0.01"
              value={data.entryPrice}
              onChange={(e) => handleNumberChange("entryPrice", e.target.value)}
              className="bg-muted border-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="markPrice" className="text-muted-foreground text-sm">Mark Price (USDT)</Label>
            <Input
              id="markPrice"
              data-testid="input-mark-price"
              type="number"
              step="0.01"
              value={data.markPrice}
              onChange={(e) => handleNumberChange("markPrice", e.target.value)}
              className="bg-muted border-input"
              disabled={isLive}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="liqPrice" className="text-muted-foreground text-sm">Liq. Price (USDT)</Label>
            <Input
              id="liqPrice"
              data-testid="input-liq-price"
              type="number"
              step="0.01"
              value={data.liqPrice}
              onChange={(e) => handleNumberChange("liqPrice", e.target.value)}
              className="bg-muted border-input"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-medium text-foreground mb-3">TP/SL</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tpPrice" className="text-muted-foreground text-sm">Take Profit</Label>
            <Input
              id="tpPrice"
              data-testid="input-tp-price"
              value={data.tpPrice}
              onChange={(e) => handleFieldChange("tpPrice", e.target.value)}
              className="bg-muted border-input"
              placeholder="--"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slPrice" className="text-muted-foreground text-sm">Stop Loss</Label>
            <Input
              id="slPrice"
              data-testid="input-sl-price"
              value={data.slPrice}
              onChange={(e) => handleFieldChange("slPrice", e.target.value)}
              className="bg-muted border-input"
              placeholder="--"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
