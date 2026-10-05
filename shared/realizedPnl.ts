import type { PnlData } from "./schema";

/**
 * Realized PNL of an OPEN Binance USDⓈ-M position = −opening fee + funding paid/received
 * while it was held. Binance charges the same fee on every crypto/USDT perp; what differs
 * per coin is the contract class (USDC / TradFi are cheaper) and, above all, funding:
 * each symbol has its own rate history and interval (1h / 4h / 8h).
 *
 * Fee rates = Binance "Regular user" tier (binance.com/en/fee/futureFee & /tradFiFee).
 */
export type FeeClass = "crypto" | "usdc" | "tradfi";

export const FEE_RATES: Record<FeeClass, { maker: number; taker: number }> = {
  crypto: { maker: 0.0002, taker: 0.0005 },
  usdc: { maker: 0, taker: 0.0004 },
  tradfi: { maker: 0, taker: 0.0004 },
};

export const DEFAULT_HOLD_HOURS = 8;
export const MAX_HOLD_HOURS = 168;

export interface FundingEvent {
  time: number;
  rate: number;
  markPrice: number;
}

export interface SymbolFeeInfo {
  symbol: string;
  feeClass: FeeClass;
  fundingIntervalHours: number;
  /** Settled funding events of the last MAX_HOLD_HOURS, oldest first */
  funding: FundingEvent[];
}

export interface RealizedPnlBreakdown {
  total: number;
  fee: number;
  feeRate: number;
  funding: number;
  fundingCount: number;
}

const FAPI = "https://fapi.binance.com/fapi/v1";
const CONTRACTS_TTL_MS = 12 * 60 * 60 * 1000;
const FUNDING_TTL_MS = 5 * 60 * 1000;
// Binance publishes a settled funding row a few seconds after the settlement time
const FUNDING_PUBLISH_LAG_MS = 15_000;

let contractsCache: { at: number; promise: Promise<Map<string, { feeClass: FeeClass; intervalHours: number }>> } | null = null;
const fundingCache = new Map<string, { expiresAt: number; promise: Promise<FundingEvent[]> }>();

export function feeClassFromSymbol(symbol: string): FeeClass {
  return symbol.toUpperCase().endsWith("USDC") ? "usdc" : "crypto";
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// exchangeInfo (contract class) + fundingInfo (non-default intervals), refreshed every 12h
function loadContracts() {
  if (contractsCache && Date.now() - contractsCache.at < CONTRACTS_TTL_MS) return contractsCache.promise;

  const promise = Promise.all([getJson(`${FAPI}/exchangeInfo`), getJson(`${FAPI}/fundingInfo`)]).then(
    ([exchangeInfo, fundingInfo]) => {
      const intervals = new Map<string, number>();
      for (const f of fundingInfo as any[]) intervals.set(f.symbol, Number(f.fundingIntervalHours) || 8);

      const map = new Map<string, { feeClass: FeeClass; intervalHours: number }>();
      for (const s of exchangeInfo.symbols as any[]) {
        const feeClass: FeeClass =
          s.contractType === "TRADIFI_PERPETUAL" ? "tradfi" : s.quoteAsset === "USDC" ? "usdc" : "crypto";
        map.set(s.symbol, { feeClass, intervalHours: intervals.get(s.symbol) ?? 8 });
      }
      return map;
    },
  );
  contractsCache = { at: Date.now(), promise };
  promise.catch(() => {
    contractsCache = null;
  });
  return promise;
}

/**
 * Funding history only changes at a settlement, so the cache lives until the next expected
 * settlement (+ publish lag), capped at FUNDING_TTL_MS. A new settlement therefore shows up
 * within ~15s; `fresh` skips the cache entirely.
 */
function loadFunding(symbol: string, intervalHours: number, fresh = false) {
  const cached = fundingCache.get(symbol);
  if (!fresh && cached && Date.now() < cached.expiresAt) return cached.promise;

  const startTime = Date.now() - MAX_HOLD_HOURS * 3600_000;
  const promise = getJson(
    `${FAPI}/fundingRate?symbol=${encodeURIComponent(symbol)}&startTime=${startTime}&limit=1000`,
  ).then((rows: any[]) =>
    rows
      .map((r) => ({ time: Number(r.fundingTime), rate: Number(r.fundingRate), markPrice: Number(r.markPrice) }))
      .filter((e) => Number.isFinite(e.time) && Number.isFinite(e.rate))
      .sort((a, b) => a.time - b.time),
  );
  const entry = { expiresAt: Date.now() + FUNDING_TTL_MS, promise };
  fundingCache.set(symbol, entry);

  promise.then(
    (events) => {
      const fetchedAt = Date.now();
      const last = events[events.length - 1];
      const nextReady = last ? last.time + intervalHours * 3600_000 + FUNDING_PUBLISH_LAG_MS : Infinity;
      // Settlement already due but its row isn't published yet → retry soon
      entry.expiresAt =
        nextReady <= fetchedAt ? fetchedAt + FUNDING_PUBLISH_LAG_MS : Math.min(fetchedAt + FUNDING_TTL_MS, nextReady);
    },
    () => {
      if (fundingCache.get(symbol) === entry) fundingCache.delete(symbol);
    },
  );
  return promise;
}

/** Public Binance data only (no API key). Throws if Binance is unreachable. */
export async function fetchSymbolFeeInfo(
  rawSymbol: string,
  options: { fresh?: boolean } = {},
): Promise<SymbolFeeInfo> {
  const symbol = rawSymbol.trim().toUpperCase();
  const contracts = await loadContracts();
  const contract = contracts.get(symbol);
  const fundingIntervalHours = contract?.intervalHours ?? 8;
  return {
    symbol,
    feeClass: contract?.feeClass ?? feeClassFromSymbol(symbol),
    fundingIntervalHours,
    funding: await loadFunding(symbol, fundingIntervalHours, options.fresh),
  };
}

/**
 * Without `info` (Binance unreachable) only the opening fee is counted.
 * `now` is injectable so server and client agree on the funding window.
 */
export function calcRealizedPnl(
  data: Partial<PnlData>,
  info: SymbolFeeInfo | null,
  now: number = Date.now(),
): RealizedPnlBreakdown {
  const entryPrice = Number(data.entryPrice) || 0;
  const size = Number(data.size) || 0;
  const isUnitUsdt = (data.sizeUnit || "").toUpperCase() === "USDT";
  const sizeInCoin = isUnitUsdt ? (entryPrice ? size / entryPrice : 0) : size;
  const direction = data.positionType === "Short" ? -1 : 1;

  const feeClass = info?.feeClass ?? feeClassFromSymbol(data.symbol || "");
  const feeRate = FEE_RATES[feeClass][data.orderType === "limit" ? "maker" : "taker"];
  const fee = Math.abs(sizeInCoin * entryPrice) * feeRate;

  // A cleared form field arrives as "" — treat it like "not set"
  const rawHold = data.holdHours as unknown;
  const hold = rawHold === "" || rawHold == null ? DEFAULT_HOLD_HOURS : Number(rawHold) || 0;
  const holdHours = Math.min(Math.max(hold, 0), MAX_HOLD_HOURS);
  const openedAt = now - holdHours * 3600_000;
  // Positive rate: longs pay shorts. Payment is on the notional at that settlement's mark price.
  const events = (info?.funding ?? []).filter((e) => e.time > openedAt && e.time <= now);
  const funding = events.reduce(
    (sum, e) => sum - direction * Math.abs(sizeInCoin) * (e.markPrice > 0 ? e.markPrice : entryPrice) * e.rate,
    0,
  );

  return { total: funding - fee, fee, feeRate, funding, fundingCount: events.length };
}
