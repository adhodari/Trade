export const SECTORS = [
  "Commercial Bank",
  "Hydropower",
  "Life Insurance",
  "Telecom",
  "Manufacturing",
  "Hotels & Tourism",
  "Investment",
  "Others",
] as const;

export type Sector = (typeof SECTORS)[number];
export type Governance = "strong" | "average" | "weak";
export type Action = "Accumulate" | "Hold" | "Wait" | "Avoid";

export type Fundamentals = {
  ltp: number;
  marketCapCr: number;
  pe: number;
  pb: number;
  eps: number;
  bookValue: number;
  roe: number;
  roa: number;
  dividendYield: number;
  payout: number;
  debtToEquity: number;
  profitGrowth3y: number;
  revenueGrowth3y: number;
  paidUpCr: number;
  npl?: number;
  car?: number;
  capacityMw?: number;
};

export type Company = {
  symbol: string;
  name: string;
  sector: Sector;
  listed: string;
  business: string;
  strengths: string[];
  risks: string[];
  governance: Governance;
  promoterHolding: number;
  fundamentals: Fundamentals;
  priceSeed: number;
  vol: number;
  drift: number;
};

export type PricePoint = { date: string; close: number };

export type FactorScores = {
  profitability: number;
  growth: number;
  balanceSheet: number;
  payout: number;
  governance: number;
};

export type CompanyAnalysis = {
  company: Company;
  prices: PricePoint[];
  change1d: number;
  change1m: number;
  change3m: number;
  change6m: number;
  foundation: number;
  valuation: number;
  momentum: number;
  factors: FactorScores;
  action: Action;
  actionWhy: string;
  forecast: Forecast;
};

export type Forecast = {
  horizonDays: number;
  expectedReturn: number;
  expectedPrice: number;
  low: number;
  high: number;
  upProbability: number;
  confidence: number;
  method: string;
};
