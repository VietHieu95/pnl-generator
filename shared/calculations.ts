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

    // Determine the original decimals from entryPrice
    const entryStr = entryPrice.toString();
    const decimals = entryStr.includes('.') ? entryStr.split('.')[1].length : 2;

    // Use default precision or entry precision, whichever is greater, up to a reasonable limit
    const liqDecimals = Math.max(2, Math.min(decimals, 8));

    if (liqPrice < 0) {
        liqPrice = 0;
    }

    // Dynamic Thresholds for Shorts
    if (positionType === 'Short' && liqPrice > 0) {
        let hideLiq = false;

        // 1. Hard ceiling - anything over $1,000,000 is always unrealistically hidden for safe shorts
        if (liqPrice > 1000000) {
            hideLiq = true;
        }
        // 2. Micro coins (< $0.01): Needs > 1000x to be considered unreachable
        else if (entryPrice < 0.01 && liqPrice > entryPrice * 1000) {
            hideLiq = true;
        }
        // 3. Pennies (< $1): Needs > 100x 
        else if (entryPrice >= 0.01 && entryPrice < 1 && liqPrice > entryPrice * 100) {
            hideLiq = true;
        }
        // 4. Mid range (< $100): Needs > 20x
        else if (entryPrice >= 1 && entryPrice < 100 && liqPrice > entryPrice * 20) {
            hideLiq = true;
        }
        // 5. Large caps (>= $100): Needs > 5x
        else if (entryPrice >= 100 && liqPrice > entryPrice * 5) {
            hideLiq = true;
        }

        if (hideLiq) {
            liqPrice = 0; // Signals UI to show '--'
        }
    }

    return {
        ...updated,
        unrealizedPnl: Number(pnl.toFixed(2)),
        roi: Number(roi.toFixed(2)),
        margin: Number(initialMargin.toFixed(2)),
        marginRatio: Number(Math.max(0, Math.min(marginRatio, 100)).toFixed(2)),
        liqPrice: Number(liqPrice.toFixed(liqDecimals))
    };
}
