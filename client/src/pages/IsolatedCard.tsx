import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { PnlData, pnlDataSchema } from "@shared/schema";
import { PnlCard } from "@/components/PnlCard";

export default function IsolatedCard() {
    const search = useSearch();
    const queryParams = new URLSearchParams(search);

    // Check if we have at least 'symbol' to consider it a stateless request
    const hasParams = queryParams.has("symbol");

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

    if (!hasParams && isLoading) return <div className="bg-[#202630] w-[480px] h-[280px] flex items-center justify-center text-white">Loading...</div>;
    if (!data) return <div className="bg-[#202630] w-[480px] h-[280px] flex items-center justify-center text-red-500">Error: No PNL data found. Please provide query params or update via POST.</div>;

    return (
        <div className="bg-[#0B0E11] min-h-screen flex items-center justify-center">
            <div id="pnl-card-container">
                <PnlCard data={data} />
            </div>
        </div>
    );
}
