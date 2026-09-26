import type { Forecast, PricePoint } from "@/lib/types";

function linReg(ys: number[]) {
  const n = ys.length;
  const xs = ys.map((_, i) => i);
  const xBar = (n - 1) / 2;
  const yBar = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xBar) * (ys[i] - yBar);
    den += (xs[i] - xBar) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yBar - slope * xBar;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const fit = intercept + slope * xs[i];
    ssTot += (ys[i] - yBar) ** 2;
    ssRes += (ys[i] - fit) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2, yBar };
}

function stdev(xs: number[]) {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(xs.length - 1, 1);
  return Math.sqrt(v);
}

function sigmoid(z: number) {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Transparent 20-session forecast:
 * 1. OLS trend on last 60 closes
 * 2. Pull halfway toward the 90-day mean (valuation/mean-reversion)
 * 3. Tilt expected return by foundation quality (better books → slightly more persistent drift)
 * 4. Bands from realized daily volatility
 *
 * This is a teaching model, not a licensed forecast.
 */
export function forecastPrice(
  prices: PricePoint[],
  foundation: number,
  valuation: number,
  horizonDays = 20,
): Forecast {
  const closes = prices.map((p) => p.close);
  const last = closes[closes.length - 1];
  const window = closes.slice(-60);
  const { slope, r2, yBar } = linReg(window);
  const mean90 = closes.slice(-90).reduce((a, b) => a + b, 0) / Math.min(90, closes.length);

  const trendPrice = last + slope * horizonDays;
  const blended = trendPrice * 0.55 + mean90 * 0.45;
  const qualityTilt = ((foundation - 55) / 100) * last * 0.03;
  const valueTilt = ((valuation - 50) / 100) * last * 0.02;
  const expectedPrice = Math.max(blended + qualityTilt + valueTilt, last * 0.5);
  const expectedReturn = ((expectedPrice - last) / last) * 100;

  const rets: number[] = [];
  for (let i = 1; i < window.length; i++) {
    rets.push(window[i] / window[i - 1] - 1);
  }
  const vol = stdev(rets);
  const band = last * vol * Math.sqrt(horizonDays) * 1.65;

  const z =
    (expectedReturn / 4) * 0.5 +
    ((foundation - 50) / 20) * 0.25 +
    ((valuation - 50) / 20) * 0.15 +
    (r2 - 0.2) * 0.4;
  const upProbability = Number((sigmoid(z) * 100).toFixed(1));
  const confidence = Number(
    Math.min(78, Math.max(22, r2 * 55 + (foundation / 100) * 25 + 10)).toFixed(1),
  );

  return {
    horizonDays,
    expectedReturn: Number(expectedReturn.toFixed(2)),
    expectedPrice: Number(expectedPrice.toFixed(2)),
    low: Number(Math.max(expectedPrice - band, last * 0.7).toFixed(2)),
    high: Number((expectedPrice + band).toFixed(2)),
    upProbability,
    confidence,
    method: `OLS trend on 60 sessions, 45% mean-reversion to 90-day average (now Rs ${yBar.toFixed(1)}), then a small tilt from foundation and valuation scores.`,
  };
}
