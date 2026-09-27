import type { Company, Fundamentals } from "@/lib/types";
import { FUNDAMENTALS, COMPANY_META } from "./fundamentals";

type CompanySymbol = keyof typeof FUNDAMENTALS;

/**
 * Build Company objects from static fundamentals and metadata.
 * Live price data (LTP, changes, volume) should be merged from NEPSE API at runtime.
 */
export function buildCompanies(livePrices?: Record<string, { ltp: number; change1d: number; volume: number }>): Company[] {
  const companies: Company[] = [];

  for (const symbol of Object.keys(FUNDAMENTALS) as CompanySymbol[]) {
    const fundamentals = FUNDAMENTALS[symbol];
    const meta = COMPANY_META[symbol];
    const live = livePrices?.[symbol];

    companies.push({
      symbol,
      name: meta.name,
      sector: meta.sector,
      listed: meta.listed,
      business: meta.business,
      strengths: meta.strengths,
      risks: meta.risks,
      governance: meta.governance,
      promoterHolding: meta.promoterHolding,
      fundamentals: {
        ...fundamentals,
        ltp: live?.ltp ?? fundamentals.ltp,
      },
      priceSeed: meta.priceSeed,
      vol: meta.vol,
      drift: meta.drift,
    });
  }

  return companies;
}

/**
 * Default companies with static data (fallback when live API unavailable)
 */
export const COMPANIES = buildCompanies();