import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { PnlData, pnlDataSchema } from "@shared/schema";
import { PnlCard, type PnlCardLanguage, type PnlCardTheme } from "@/components/PnlCard";
import { PnlChart } from "@/components/PnlChart";
import { parseInterval, syntheticCandles, useKlines } from "@/hooks/useKlines";

export default function IsolatedCard() {
    // Use window.location.search for more reliable parameter detection in all environments
    const queryParams = new URLSearchParams(window.location.search);

    // Check if we have at least 'symbol' to consider it a stateless request
    const hasParams = queryParams.has("symbol");
    const cardLanguage: PnlCardLanguage = queryParams.get("lang") === "zh" ? "zh" : "en";
    const themeParam = queryParams.get("theme");
    const cardTheme: PnlCardTheme = themeParam === "light" || themeParam === "black" ? themeParam : "dark";

    // ?chart=1 adds the Binance-style candlestick panel under the card (real klines).
    const withChart = queryParams.get("chart") === "1";
    const chartInterval = parseInterval(queryParams.get("interval"));
    const timeZone = queryParams.get("tz") || "Asia/Ho_Chi_Minh";
    const klines = useKlines(withChart ? queryParams.get("symbol") || "" : "", chartInterval, false);

    const { data: apiData, isLoading, error } = useQuery<PnlData>({
        queryKey: ["/api/pnl"],
        enabled: !hasParams, // Skip fetch if we have query params
    });

    let data = apiData;

    if (hasParams) {
        // Parse data from query parameters
        const rawData: Record<string, any> = {};
        queryParams.forEach((value, key) => {
            rawData[key] = value;
        });

        // Use zod schema to parse and validate parameters
        const result = pnlDataSchema.safeParse(rawData);
        if (result.success) {
            data = result.data as PnlData;
        } else {
            console.error("Invalid query parameters:", result.error);
        }
    }

    if (!hasParams && isLoading) return <div className="bg-[#202630] w-[480px] h-[297px] flex items-center justify-center text-white">Loading...</div>;
    if (!data) return <div className="bg-[#202630] w-[480px] h-[297px] flex items-center justify-center text-red-500">Error: No PNL data found. Please provide query params or update via POST.</div>;

    // The render server screenshots #pnl-card-container as soon as it exists, so with a
    // chart it only mounts once the candles have loaded (or failed -> synthetic candles).
    if (withChart && !klines.ready) return <div className="bg-[#0B0E11] min-h-screen" />;
    const candles = withChart
        ? klines.candles.length
            ? klines.candles
            : syntheticCandles(data.entryPrice, data.markPrice, chartInterval)
        : [];

    return (
        <div className="bg-[#0B0E11] min-h-screen flex items-center justify-center">
            <div id="pnl-card-container">
                <PnlCard data={data} language={cardLanguage} theme={cardTheme} />
                {withChart && (
                    <PnlChart
                        data={data}
                        candles={candles}
                        interval={chartInterval}
                        priceDecimals={klines.candles.length ? klines.priceDecimals : 2}
                        now={Date.now()}
                        theme={cardTheme}
                        language={cardLanguage}
                        timeZone={timeZone}
                    />
                )}
            </div>
        </div>
    );
}
