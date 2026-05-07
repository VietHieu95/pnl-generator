type ApiRequest = {
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

function getRequestedSymbols(value: unknown): string[] {
  const raw = Array.isArray(value) ? value.join(",") : value;
  if (typeof raw !== "string") return [];

  return Array.from(
    new Set(
      raw
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""))
        .filter(Boolean),
    ),
  );
}

function getPrice(value: unknown): number {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Invalid price payload");
  }

  return price;
}

function splitSymbol(symbol: string): { base: string; quote: string } | null {
  for (const quote of ["USDT", "USDC", "BUSD", "USD"]) {
    if (symbol.endsWith(quote) && symbol.length > quote.length) {
      return { base: symbol.slice(0, -quote.length), quote };
    }
  }

  return null;
}

async function fetchBinanceMarkPrice(symbol: string): Promise<number> {
  const pair = splitSymbol(symbol);
  const dashedSymbol = pair ? `${pair.base}-${pair.quote}` : symbol;
  const endpoints = [
    {
      url: `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${encodeURIComponent(symbol)}`,
      parse: (payload: any) => getPrice(payload.price),
    },
    {
      url: `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`,
      parse: (payload: any) => getPrice(payload.price),
    },
    {
      url: `https://data-api.binance.vision/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`,
      parse: (payload: any) => getPrice(payload.price),
    },
    {
      url: `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${encodeURIComponent(symbol)}`,
      parse: (payload: any) => getPrice(payload.result?.list?.[0]?.markPrice || payload.result?.list?.[0]?.lastPrice),
    },
    {
      url: `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${encodeURIComponent(symbol)}`,
      parse: (payload: any) => getPrice(payload.result?.list?.[0]?.lastPrice),
    },
    {
      url: `https://www.okx.com/api/v5/market/ticker?instId=${encodeURIComponent(`${dashedSymbol}-SWAP`)}`,
      parse: (payload: any) => getPrice(payload.data?.[0]?.last),
    },
    {
      url: `https://www.okx.com/api/v5/market/ticker?instId=${encodeURIComponent(dashedSymbol)}`,
      parse: (payload: any) => getPrice(payload.data?.[0]?.last),
    },
    {
      url: `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${encodeURIComponent(dashedSymbol)}`,
      parse: (payload: any) => getPrice(payload.data?.price),
    },
  ];
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "pnl-generator/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return endpoint.parse(await response.json());
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw new Error(
    `Unable to fetch live price for ${symbol}${lastError ? `: ${lastError.message}` : ""}`,
  );
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const symbols = getRequestedSymbols(req.query?.symbols);
  if (symbols.length === 0) {
    return res.status(400).json({ message: "Missing symbols" });
  }

  const results = await Promise.allSettled(
    symbols.map(async (symbol) => ({
      symbol,
      price: await fetchBinanceMarkPrice(symbol),
    })),
  );

  const prices = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );

  if (prices.length === 0) {
    return res.status(502).json({ message: "Unable to fetch live prices" });
  }

  return res.status(200).json({ prices });
}
