import { buildCompanies } from "@/lib/data/companies";
import { fetchLiveMarketData, fetchNepseIndex, fetchHistoricalPrices } from "@/lib/nepse-api";
import {
  decideAction,
  factorScores,
  foundationScore,
  momentumScore,
  valuationScore,
} from "@/lib/scoring";
import { forecastPrice } from "@/lib/predict";
import { buildPriceSeries, pctChange } from "@/lib/prices";
import type { Company, CompanyAnalysis, Sector, Fundamentals } from "@/lib/types";

function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function sectorMedians(companies: Company[]) {
  const map = new Map<Sector, { pe: number; pb: number }>();
  const bySector = new Map<Sector, Company[]>();
  for (const c of companies) {
    const list = bySector.get(c.sector) ?? [];
    list.push(c);
    bySector.set(c.sector, list);
  }
  for (const [sector, list] of bySector) {
    map.set(sector, {
      pe: median(list.map((c) => c.fundamentals.pe)),
      pb: median(list.map((c) => c.fundamentals.pb)),
    });
  }
  return map;
}

// Cache for live data to avoid redundant API calls
let liveDataCache: { 
  companies: Company[]; 
  allLiveStocks: Company[]; 
  medians: Map<Sector, { pe: number; pb: number }>; 
  timestamp: number 
} | null = null;
const CACHE_TTL = 30000; // 30 seconds

// Historical prices cache (separate from live data cache)
const historicalPricesCache = new Map<string, { prices: { date: string; close: number }[]; timestamp: number }>();
const HISTORICAL_CACHE_TTL = 300000; // 5 minutes

// Track which symbols have static fundamentals
const STATIC_FUNDAMENTALS_SYMBOLS = new Set([
  "NABIL", "SCB", "GBIME", "NICA", "NTC", "UNL", "BNL", "HDL",
  "SHIVM", "CHCL", "UPPER", "NLIC", "OHL", "HIDCL", "NIFRA", "CIT"
]);

/**
 * Default fundamentals for stocks without static data
 */
const DEFAULT_FUNDAMENTALS: Fundamentals = {
  ltp: 0,
  marketCapCr: 0,
  pe: 0,
  pb: 0,
  eps: 0,
  bookValue: 0,
  roe: 0,
  roa: 0,
  dividendYield: 0,
  payout: 0,
  debtToEquity: 0,
  profitGrowth3y: 0,
  revenueGrowth3y: 0,
  paidUpCr: 0,
};

/**
 * Map NEPSE sector to our internal sector
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
 * Build a basic Company from live API data (for stocks without static fundamentals)
 */
function buildLiveOnlyCompany(symbol: string, data: any): Company {
  return {
    symbol,
    name: data.securityName || symbol,
    sector: mapSector(data.sectorName),
    listed: "N/A",
    business: "Live data only - fundamental analysis not available",
    strengths: [],
    risks: [],
    governance: "average" as const,
    promoterHolding: 0,
    fundamentals: {
      ...DEFAULT_FUNDAMENTALS,
      ltp: data.ltp || 0,
    },
    priceSeed: Math.floor(Math.random() * 1000),
    vol: 0.02,
    drift: 0,
  };
}

/**
 * Fetch live market data and build companies with real prices (with caching)
 * Returns both: 16 full-analysis companies + all live stocks
 */
export async function getCompaniesWithLiveData(): Promise<Company[]> {
  const now = Date.now();
  if (liveDataCache && now - liveDataCache.timestamp < CACHE_TTL) {
    return liveDataCache.companies;
  }

  const liveData = await fetchLiveMarketData();

  const livePrices: Record<string, { ltp: number; change1d: number; volume: number }> = {};
  const allLiveStocks: Company[] = [];

  if (liveData?.scripsDetails) {
    for (const [symbol, data] of Object.entries(liveData.scripsDetails)) {
      const scrip = data as {
        ltp?: number;
        percentageChange?: number;
        totalTradeQuantity?: number;
        sectorName?: string;
        securityName?: string;
      };
      if (scrip.ltp) {
        livePrices[symbol] = {
          ltp: scrip.ltp,
          change1d: scrip.percentageChange ?? 0,
          volume: scrip.totalTradeQuantity ?? 0,
        };
        // Build basic company for ALL live stocks
        allLiveStocks.push(buildLiveOnlyCompany(symbol, scrip));
      }
    }
  }

  // Get the 16 full-analysis companies (merged with live prices)
  const fullAnalysisCompanies = buildCompanies(livePrices);
  
  // Merge: full-analysis companies take priority, add live-only stocks that aren't in the 16
  const fullSymbols = new Set(fullAnalysisCompanies.map(c => c.symbol));
  const mergedCompanies = [
    ...fullAnalysisCompanies,
    ...allLiveStocks.filter(c => !fullSymbols.has(c.symbol))
  ];

  const medians = sectorMedians(mergedCompanies);
  
  liveDataCache = { companies: mergedCompanies, allLiveStocks: mergedCompanies, medians, timestamp: now };
  return mergedCompanies;
}

/**
 * Get ONLY the 16 full-analysis companies (for detailed pages)
 */
export async function getFullAnalysisCompanies(): Promise<Company[]> {
  const all = await getCompaniesWithLiveData();
  // Filter to only those with real fundamentals (non-zero PE)
  return all.filter(c => c.fundamentals.pe > 0);
}

/**
 * Get ALL live stocks (for universe table/screener)
 */
export async function getAllLiveStocks(): Promise<Company[]> {
  return getCompaniesWithLiveData();
}



/**
 * Get cached sector medians
 */
export async function getSectorMedians() {
  await getCompaniesWithLiveData(); // Ensure cache is populated
  return liveDataCache?.medians ?? new Map();
}


/**
 * Fetch historical prices with caching
 */
async function getHistoricalPricesCached(symbol: string, days = 180): Promise<{ date: string; close: number }[]> {
  const now = Date.now();
  const cached = historicalPricesCache.get(symbol);
  if (cached && now - cached.timestamp < HISTORICAL_CACHE_TTL) {
    return cached.prices;
  }

  try {
    const prices = await fetchHistoricalPrices(symbol, days);
    if (prices.length > 0) {
      historicalPricesCache.set(symbol, { prices, timestamp: now });
    }
    return prices;
  } catch {
    return [];
  }
}

/**
 * Check if a company has static fundamentals (full analysis available)
 */
function hasStaticFundamentals(company: Company): boolean {
  return STATIC_FUNDAMENTALS_SYMBOLS.has(company.symbol);
}

/**
 * Analyze a single company with live data
 * For full-analysis stocks: complete foundation/valuation/momentum/forecast
 * For live-only stocks: momentum + basic forecast, Foundation/Value = N/A
 */
export async function analyzeCompany(company: Company): Promise<CompanyAnalysis> {
  const hasFullData = hasStaticFundamentals(company);
  
  // Use cached sector medians
  const medians = await getSectorMedians();
  const med = medians.get(company.sector) ?? { pe: 18, pb: 2.2 };

  // Fetch historical prices (with timeout)
  let prices = buildPriceSeries(company);
  try {
    const historicalData = await Promise.race([
      getHistoricalPricesCached(company.symbol, 180),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000)),
    ]);
    if (historicalData.length > 10) {
      prices = historicalData;
    }
  } catch {
    // Fall back to simulated prices
  }

  // Calculate price changes from historical data
  const change1d = pctChange(prices, 1);
  const change1m = pctChange(prices, 21);
  const change3m = pctChange(prices, 63);
  const change6m = pctChange(prices, 126);

  // For stocks with static fundamentals: full analysis
  if (hasFullData) {
    const foundation = foundationScore(company);
    const valuation = valuationScore(company, med.pe, med.pb);
    const momentum = momentumScore(change1m, change3m, change6m);
    const { action, why } = decideAction(foundation, valuation, momentum);

    return {
      company,
      prices,
      change1d,
      change1m,
      change3m,
      change6m,
      foundation,
      valuation,
      momentum,
      factors: factorScores(company),
      action,
      actionWhy: why,
      forecast: forecastPrice(prices, foundation, valuation),
    };
  }

  // For live-only stocks: momentum + basic forecast only
  // Foundation/Value not available (no fundamentals)
  const momentum = momentumScore(change1m, change3m, change6m);
  
  // Simple momentum-based action
  let action: CompanyAnalysis["action"] = "Wait";
  let actionWhy = "Live data only - fundamental analysis not available. Action based on price momentum only.";
  if (momentum >= 70 && change1m > 5) {
    action = "Hold";
    actionWhy = "Positive momentum but no fundamental data to confirm quality. Monitor for entry.";
  } else if (momentum <= 30 && change1m < -5) {
    action = "Avoid";
    actionWhy = "Negative momentum without fundamental support. Avoid until financials available.";
  } else if (momentum >= 60) {
    action = "Hold";
  }

  // Basic forecast using only price trend (no foundation/valuation tilt)
  const forecast = forecastPrice(prices, 50, 50); // Neutral foundation/valuation

  return {
    company,
    prices,
    change1d,
    change1m,
    change3m,
    change6m,
    foundation: 0, // N/A
    valuation: 0,  // N/A
    momentum,
    factors: { profitability: 0, growth: 0, balanceSheet: 0, payout: 0, governance: 0 },
    action,
    actionWhy,
    forecast,
  };
}

/**
 * Analyze all 16 full-analysis companies with live data
 */
export async function analyzeAll(): Promise<CompanyAnalysis[]> {
  const companies = await getFullAnalysisCompanies();
  const analyses = await Promise.all(companies.map(analyzeCompany));
  return analyses.sort((a, b) => b.foundation - a.foundation);
}

/**
 * Analyze ALL live stocks (300+) with appropriate analytics
 * Full analysis for 16 stocks, momentum+forecast for rest
 */
export async function analyzeAllLive(): Promise<CompanyAnalysis[]> {
  const companies = await getAllLiveStocks();
  
  // Process in batches to avoid overwhelming the API
  const batchSize = 20;
  const analyses: CompanyAnalysis[] = [];
  
  for (let i = 0; i < companies.length; i += batchSize) {
    const batch = companies.slice(i, i + batchSize);
    const batchAnalyses = await Promise.all(batch.map(analyzeCompany));
    analyses.push(...batchAnalyses);
    
    // Small delay between batches to be respectful to the API
    if (i + batchSize < companies.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  
  // Sort: full-analysis stocks first (by foundation), then live-only (by momentum)
  return analyses.sort((a, b) => {
    const aFull = a.foundation > 0;
    const bFull = b.foundation > 0;
    if (aFull && !bFull) return -1;
    if (!aFull && bFull) return 1;
    if (aFull && bFull) return b.foundation - a.foundation;
    return b.momentum - a.momentum;
  });
}

/**
 * Get basic live data for ALL stocks (for universe table/screener)
 * Returns simplified analysis without foundation/valuation scoring for live-only stocks
 */
export async function getAllLiveStocksBasic(): Promise<Array<{
  company: Company;
  change1d: number;
  ltp: number;
  volume: number;
}>> {
  const stocks = await getAllLiveStocks();
  return stocks.map(s => ({
    company: s,
    change1d: 0,
    ltp: s.fundamentals.ltp,
    volume: 0,
  }));
}

/**
 * Get light live data for ALL stocks (for fast home page universe table)
 * Returns basic live data WITHOUT fetching historical prices
 * Includes computed momentum from live percentage change
 */
export async function getAllLiveStocksLight(): Promise<Array<{
  company: Company;
  change1d: number;
  ltp: number;
  volume: number;
  momentum: number;
  action: "Accumulate" | "Hold" | "Wait" | "Avoid";
}>> {
  const liveData = await fetchLiveMarketData();
  const stocks = await getAllLiveStocks();
  
  // Build lookup from live data
  const livePrices: Record<string, { ltp: number; change1d: number; volume: number }> = {};
  if (liveData?.scripsDetails) {
    for (const [symbol, data] of Object.entries(liveData.scripsDetails)) {
      const scrip = data as { ltp?: number; percentageChange?: number; totalTradeQuantity?: number };
      if (scrip.ltp) {
        livePrices[symbol] = {
          ltp: scrip.ltp,
          change1d: scrip.percentageChange ?? 0,
          volume: scrip.totalTradeQuantity ?? 0,
        };
      }
    }
  }

  return stocks.map(s => {
    const live = livePrices[s.symbol];
    const change1d = live?.change1d ?? 0;
    const momentum = Math.max(0, Math.min(100, 50 + change1d * 2)); // Simple momentum from 1D change
    
    // Simple action based on momentum + price direction
    let action: "Accumulate" | "Hold" | "Wait" | "Avoid" = "Wait";
    if (momentum >= 70 && change1d > 2) action = "Accumulate";
    else if (momentum <= 30 && change1d < -2) action = "Avoid";
    else if (momentum >= 60) action = "Hold";

    return {
      company: s,
      change1d,
      ltp: live?.ltp ?? s.fundamentals.ltp,
      volume: live?.volume ?? 0,
      momentum,
      action,
    };
  });
}

/**
 * Get a single company by symbol (full analysis if available, otherwise basic)
 */
export async function getCompany(symbol: string): Promise<Company | undefined> {
  const companies = await getAllLiveStocks();
  return companies.find((c) => c.symbol.toLowerCase() === symbol.toLowerCase());
}

/**
 * Get full analysis for a single company (for detail pages)
 */
export async function getCompanyAnalysis(symbol: string): Promise<CompanyAnalysis | undefined> {
  const companies = await getAllLiveStocks();
  const company = companies.find((c) => c.symbol.toLowerCase() === symbol.toLowerCase());
  if (!company) return undefined;
  return analyzeCompany(company);
}

/**
 * Get market pulse with real NEPSE index data
 */
export async function marketPulse(rows: CompanyAnalysis[]) {
  const fullAnalysisRows = rows.filter(r => r.foundation > 0);
  const avgFound = fullAnalysisRows.length 
    ? fullAnalysisRows.reduce((a, r) => a + r.foundation, 0) / fullAnalysisRows.length 
    : 0;
  const avgVal = fullAnalysisRows.length
    ? fullAnalysisRows.reduce((a, r) => a + r.valuation, 0) / fullAnalysisRows.length
    : 0;
  const breadth =
    (rows.filter((r) => r.change1d >= 0).length / rows.length) * 100;
  const cap = rows.reduce((a, r) => a + r.company.fundamentals.marketCapCr, 0);

  // Fetch real NEPSE index
  let nepse = 2742.18;
  let nepseChange = 0.42;
  try {
    const indexData = await fetchNepseIndex();
    if (indexData?.["NEPSE Index"]) {
      nepse = indexData["NEPSE Index"].currentValue ?? nepse;
      nepseChange = indexData["NEPSE Index"].perChange ?? nepseChange;
    }
  } catch {
    // Use defaults
  }

  return {
    names: rows.length,
    avgFoundation: Number(avgFound.toFixed(1)),
    avgValuation: Number(avgVal.toFixed(1)),
    breadth: Number(breadth.toFixed(0)),
    marketCapCr: Math.round(cap),
    nepse,
    nepseChange,
  };
}

/**
 * Synchronous version for backward compatibility (uses static data only)
 */
export function analyzeAllSync() {
  const companies = buildCompanies();
  const MEDIANS = sectorMedians(companies);
  return companies.map((company) => {
    const prices = buildPriceSeries(company);
    const change1d = pctChange(prices, 1);
    const change1m = pctChange(prices, 21);
    const change3m = pctChange(prices, 63);
    const change6m = pctChange(prices, 126);

    const med = MEDIANS.get(company.sector) ?? { pe: 18, pb: 2.2 };

    const foundation = foundationScore(company);
    const valuation = valuationScore(company, med.pe, med.pb);
    const momentum = momentumScore(change1m, change3m, change6m);
    const { action, why } = decideAction(foundation, valuation, momentum);

    return {
      company,
      prices,
      change1d,
      change1m,
      change3m,
      change6m,
      foundation,
      valuation,
      momentum,
      factors: factorScores(company),
      action,
      actionWhy: why,
      forecast: forecastPrice(prices, foundation, valuation),
    };
  }).sort((a, b) => b.foundation - a.foundation);
}

