import { PnlData } from "./schema";

export function calculatePnlValues(data: Partial<PnlData>): Partial<PnlData> {
    const updated = { ...data };

    // Only automate everything if we have entryPrice and size
    if (!updated.entryPrice || !updated.size) return updated;

    const leverage = updated.leverage || 20;
    const entryPrice = updated.entryPrice;
    const markPrice = updated.markPrice || entryPrice;
    const positionType = updated.positionType || 'Long';
    const size = updated.size;
    const sizeUnit = updated.sizeUnit || 'BTC';
    const walletBalance = updated.walletBalance || 10000;
    const marginMode = updated.marginMode || 'Cross';

    // Determine the actual position value based on unit
    const isUnitUsdt = sizeUnit.toUpperCase() === 'USDT';
    const positionValue = isUnitUsdt ? size : entryPrice * size;
    const sizeInCoin = isUnitUsdt ? size / entryPrice : size;

    const direction = positionType === 'Long' ? 1 : -1;
    const pnl = (markPrice - entryPrice) * sizeInCoin * direction;
    const initialMargin = positionValue / leverage;
    const roi = (pnl / initialMargin) * 100;

    const maintenanceMargin = positionValue * 0.004; // Standard 0.4% MMR
    const marginBalance = walletBalance + pnl;
    const marginRatio = marginBalance <= 0 ? 100 : (maintenanceMargin / marginBalance) * 100;

    // Liquidation Price calculation
    let liqPrice = 0;
    const mmr = 0.004;
    if (marginMode === 'Cross') {
        if (positionType === 'Long') {
            liqPrice = entryPrice * (1 - (walletBalance / positionValue) + mmr);
        } else {
            liqPrice = entryPrice * (1 + (walletBalance / positionValue) - mmr);
        }
    } else {
        liqPrice = positionType === 'Long'
            ? entryPrice * (1 - (1 / leverage) + mmr)
            : entryPrice * (1 + (1 / leverage) - mmr);
    }

    liqPrice = Math.max(0, liqPrice);

    return {
        ...updated,
        unrealizedPnl: Number(pnl.toFixed(2)),
        roi: Number(roi.toFixed(2)),
        margin: Number(initialMargin.toFixed(2)),
        marginRatio: Number(Math.max(0, Math.min(marginRatio, 100)).toFixed(2)),
        liqPrice: Number(liqPrice.toFixed(2))
    };
}
