import { COMPANIES } from "@/lib/data/companies";
import {
  decideAction,
  factorScores,
  foundationScore,
  momentumScore,
  valuationScore,
} from "@/lib/scoring";
import { forecastPrice } from "@/lib/predict";
import { buildPriceSeries, pctChange } from "@/lib/prices";
import type { Company, CompanyAnalysis, Sector } from "@/lib/types";

function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function sectorMedians() {
  const map = new Map<Sector, { pe: number; pb: number }>();
  const bySector = new Map<Sector, Company[]>();
  for (const c of COMPANIES) {
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

const MEDIANS = sectorMedians();

export function analyzeCompany(company: Company): CompanyAnalysis {
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
}

export function analyzeAll() {
  return COMPANIES.map(analyzeCompany).sort((a, b) => b.foundation - a.foundation);
}

export function getCompany(symbol: string) {
  return COMPANIES.find((c) => c.symbol.toLowerCase() === symbol.toLowerCase());
}

export function marketPulse(rows: CompanyAnalysis[]) {
  const avgFound = rows.reduce((a, r) => a + r.foundation, 0) / rows.length;
  const avgVal = rows.reduce((a, r) => a + r.valuation, 0) / rows.length;
  const breadth =
    (rows.filter((r) => r.change1d >= 0).length / rows.length) * 100;
  const cap = rows.reduce((a, r) => a + r.company.fundamentals.marketCapCr, 0);
  return {
    names: rows.length,
    avgFoundation: Number(avgFound.toFixed(1)),
    avgValuation: Number(avgVal.toFixed(1)),
    breadth: Number(breadth.toFixed(0)),
    marketCapCr: Math.round(cap),
    nepse: 2742.18,
    nepseChange: 0.42,
  };
}
