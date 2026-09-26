import type { Action, Company, FactorScores } from "@/lib/types";

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

function band(value: number, good: number, poor: number) {
  if (good === poor) return 50;
  const t = (value - poor) / (good - poor);
  return clamp(t * 100);
}

export function factorScores(company: Company): FactorScores {
  const f = company.fundamentals;
  const bank = company.sector === "Commercial Bank";

  const profitability = clamp(
    band(f.roe, 18, 6) * 0.7 + band(f.roa, bank ? 1.8 : 10, bank ? 0.6 : 2) * 0.3,
  );

  const growth = clamp(
    band(f.profitGrowth3y, 15, -5) * 0.65 + band(f.revenueGrowth3y, 12, -4) * 0.35,
  );

  const nplScore = f.npl !== undefined ? band(f.npl, 0.8, 4.5) : 70;
  const carScore = f.car !== undefined ? band(f.car, 16, 11) : 70;
  const leverageScore = bank ? 80 : band(f.debtToEquity, 0.2, 1.4);
  const balanceSheet = clamp(
    bank ? nplScore * 0.5 + carScore * 0.35 + leverageScore * 0.15 : leverageScore,
  );

  const payout =
    f.dividendYield <= 0
      ? 35
      : clamp(band(f.dividendYield, 5, 0.5) * 0.7 + band(Math.min(f.payout, 80), 55, 15) * 0.3);

  const governance =
    company.governance === "strong" ? 86 : company.governance === "average" ? 62 : 34;

  return {
    profitability: Number(profitability.toFixed(1)),
    growth: Number(growth.toFixed(1)),
    balanceSheet: Number(balanceSheet.toFixed(1)),
    payout: Number(payout.toFixed(1)),
    governance,
  };
}

export function foundationScore(company: Company) {
  const f = factorScores(company);
  const raw =
    f.profitability * 0.32 +
    f.growth * 0.18 +
    f.balanceSheet * 0.22 +
    f.payout * 0.13 +
    f.governance * 0.15;
  return Number(clamp(raw).toFixed(1));
}

export function valuationScore(company: Company, sectorMedianPe: number, sectorMedianPb: number) {
  const { pe, pb } = company.fundamentals;
  const peScore = band(pe, sectorMedianPe * 0.7, sectorMedianPe * 1.6);
  const pbScore = band(pb, sectorMedianPb * 0.75, sectorMedianPb * 1.8);
  return Number(clamp(peScore * 0.55 + pbScore * 0.45).toFixed(1));
}

export function momentumScore(change1m: number, change3m: number, change6m: number) {
  const s =
    band(change1m, 8, -10) * 0.45 +
    band(change3m, 14, -16) * 0.35 +
    band(change6m, 20, -22) * 0.2;
  return Number(clamp(s).toFixed(1));
}

export function decideAction(
  foundation: number,
  valuation: number,
  momentum: number,
): { action: Action; why: string } {
  if (foundation < 42) {
    return {
      action: "Avoid",
      why: "Business quality is too weak to underwrite. Price momentum is not a substitute for earnings power, capital, and governance.",
    };
  }
  if (foundation >= 70 && valuation >= 62) {
    return {
      action: "Accumulate",
      why: "Solid franchise at a valuation that is not stretched versus its sector. Size in on weakness; this is a foundation call, not a week-ahead trade.",
    };
  }
  if (foundation >= 62 && valuation < 40) {
    return {
      action: "Wait",
      why: "The company is good enough, but the multiple already prices a lot of the story. Wait for a better entry or accumulate only with a long horizon.",
    };
  }
  if (foundation >= 55 && valuation >= 50) {
    return {
      action: "Hold",
      why: "Adequate business at a fair price. Neither a screaming bargain nor a quality problem. Revisit if ROE or asset quality breaks.",
    };
  }
  if (momentum >= 72 && foundation < 55) {
    return {
      action: "Avoid",
      why: "Tape is strong but the books are not. Chasing hydro/IPO momentum without earnings is how NEPSE accounts get stuck.",
    };
  }
  return {
    action: "Wait",
    why: "Mixed signals: neither cheap enough nor high-quality enough to act. Park it on a watchlist and demand better numbers or a lower price.",
  };
}
