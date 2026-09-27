import { SECTORS, type Sector, type Company, type Fundamentals } from "@/lib/types";

const NEPSE_API_BASE = process.env.NEPSE_API_BASE || "http://localhost:8000";

/**
 * Fetches live market data from the NEPSE API server
 */
export async function fetchLiveMarketData() {
  try {
    const response = await fetch(`${NEPSE_API_BASE}/api/trade-turnover-transaction-subindices`, {
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      throw new Error(`NEPSE API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch live market data:", error);
    return null;
  }
}

/**
 * Fetches market summary
 */
export async function fetchMarketSummary() {
  try {
    const response = await fetch(`${NEPSE_API_BASE}/api/summary`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`NEPSE API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch market summary:", error);
    return null;
  }
}

/**
 * Fetches NEPSE index data
 */
export async function fetchNepseIndex() {
  try {
    const response = await fetch(`${NEPSE_API_BASE}/api/nepse-index`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`NEPSE API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch NEPSE index:", error);
    return null;
  }
}

/**
 * Map NEPSE sector name to our internal sector type
 */
function mapSector(nepseSector: string): Sector {
  const sectorMap: Record<string, Sector> = {
    "Commercial Banks": "Commercial Bank",
    "Development Banks": "Others",
    "Finance": "Others",
    "Hotels And Tourism": "Hotels & Tourism",
    "Hydro Power": "Hydropower",
    "Investment": "Investment",
    "Life Insurance": "Life Insurance",
    "Manufacturing And Processing": "Manufacturing",
    "Microfinance": "Others",
    "Mutual Fund": "Others",
    "Non Life Insurance": "Others",
    "Others": "Others",
    "Tradings": "Others",
  };

  return sectorMap[nepseSector] || "Others";
}

/**
 * Transform live market data to our Company type
 * Note: Fundamental data (ROE, EPS, book value, etc.) is NOT available from live trading API.
 * This only provides live price data. Fundamental data must come from financial reports.
 */
export function transformLiveDataToCompanies(
  liveData: { scripsDetails: Record<string, any>; sectorsDetails: Record<string, any> },
  staticFundamentals: Record<string, Fundamentals>
): Company[] {
  const { scripsDetails } = liveData;
  const companies: Company[] = [];

  for (const [symbol, data] of Object.entries(scripsDetails)) {
    // Only include companies that have fundamental data in our static file
    if (!staticFundamentals[symbol]) {
      continue;
    }

    const fundamentals = staticFundamentals[symbol];
    const ltp = data.ltp || fundamentals.ltp;
    const change1d = data.percentageChange || 0;

    companies.push({
      symbol,
      name: data.securityName || symbol,
      sector: mapSector(data.sectorName),
      listed: "2020", // Would need separate API for listing date
      business: "",
      strengths: [],
      risks: [],
      governance: "average" as const,
      promoterHolding: 50,
      fundamentals: {
        ...fundamentals,
        ltp,
        // Update market cap based on live price if shares outstanding known
        marketCapCr: fundamentals.marketCapCr,
      },
      priceSeed: Math.floor(Math.random() * 1000),
      vol: 0.02,
      drift: change1d / 100 / 252, // Approximate daily drift from 1D change
    });
  }

  return companies;
}

/**
 * Get live price data for a specific symbol
 */
export async function fetchLivePrice(symbol: string) {
  try {
    const response = await fetch(`${NEPSE_API_BASE}/api/company-fundamentals/${symbol}`, {
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      throw new Error(`NEPSE API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch live price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get historical price data for a symbol
 */
export async function fetchHistoricalPrices(symbol: string, days = 180) {
  try {
    const response = await fetch(`${NEPSE_API_BASE}/api/daily-price-graph/${symbol}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`NEPSE API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to our PricePoint format
    if (Array.isArray(data)) {
      return data
        .slice(-days)
        .map((point: any) => ({
          date: point.date || point.tradingDate,
          close: point.close || point.ltp || point.lastTradedPrice,
        }))
        .filter((p: any) => p.date && p.close);
    }

    return [];
  } catch (error) {
    console.error(`Failed to fetch historical prices for ${symbol}:`, error);
    return [];
  }
}

/**
 * Check if NEPSE API server is healthy
 */
export async function checkNepseApiHealth() {
  try {
    const response = await fetch(`${NEPSE_API_BASE}/health`, {
      next: { revalidate: 60 },
    });
    return response.ok;
  } catch {
    return false;
  }
}