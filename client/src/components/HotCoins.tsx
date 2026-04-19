import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Flame, TrendingUp } from "lucide-react";

interface HotCoin {
  symbol: string;
  priceChangePercent: string;
  lastPrice: string;
}

interface HotCoinsProps {
  onSelect: (symbol: string) => void;
}

export function HotCoins({ onSelect }: HotCoinsProps) {
  const { data: hotCoins, isLoading } = useQuery<HotCoin[]>({
    queryKey: ["hot-coins-direct"],
    queryFn: async () => {
      const response = await fetch("https://fapi.binance.com/fapi/v1/ticker/24hr");
      if (!response.ok) throw new Error("Failed to fetch from Binance");
      const data = await response.json() as any[];
      return data
        .filter((t) => t.symbol.endsWith("USDT"))
        .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
        .slice(0, 10)
        .map((t) => ({
          symbol: t.symbol,
          priceChangePercent: t.priceChangePercent,
          lastPrice: t.lastPrice
        }));
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="animate-pulse h-10 w-full bg-white/5 rounded-lg" />;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Hot Gainers (Scalp)</h3>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {hotCoins?.map((coin) => (
          <Button
            key={coin.symbol}
            variant="outline"
            size="sm"
            onClick={() => onSelect(coin.symbol)}
            className="h-9 px-3 bg-white/5 border-white/5 hover:bg-white/10 flex-col items-start gap-0 py-1"
          >
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold">{coin.symbol.replace("USDT", "")}</span>
              <span className="text-[8px] text-green-500 font-bold">+{parseFloat(coin.priceChangePercent).toFixed(1)}%</span>
            </div>
            <span className="text-[8px] text-muted-foreground">${parseFloat(coin.lastPrice).toLocaleString()}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
