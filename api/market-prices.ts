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

async function fetchBinanceMarkPrice(symbol: string): Promise<number> {
  const endpoints = [
    `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${encodeURIComponent(symbol)}`,
    `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`,
    `https://data-api.binance.vision/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`,
  ];
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
          "User-Agent": "pnl-generator/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as { price?: string };
      const price = Number(payload.price);

      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Invalid price payload");
      }

      return price;
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
