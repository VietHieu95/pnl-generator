import { useQuery } from "@tanstack/react-query";
import { PnlData } from "@shared/schema";
import { PnlCard } from "@/components/PnlCard";

export default function IsolatedCard() {
    const { data, isLoading, error } = useQuery<PnlData>({
        queryKey: ["/api/pnl"],
    });

    if (isLoading) return <div className="bg-[#202630] w-[480px] h-[280px] flex items-center justify-center text-white">Loading...</div>;
    if (error || !data) return <div className="bg-[#202630] w-[480px] h-[280px] flex items-center justify-center text-red-500">Error loading data</div>;

    return (
        <div className="bg-[#0B0E11] min-h-screen flex items-center justify-center">
            <div id="pnl-card-container">
                <PnlCard data={data} />
            </div>
        </div>
    );
}
