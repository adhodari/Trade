import type { Company, PricePoint } from "@/lib/types";

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tradingDaysBack(count: number, end = new Date("2026-09-25")) {
  const days: Date[] = [];
  const cursor = new Date(end);
  while (days.length < count) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return days.reverse();
}

export function buildPriceSeries(company: Company, days = 180): PricePoint[] {
  const rng = mulberry32(company.priceSeed);
  const dates = tradingDaysBack(days);
  const start = company.fundamentals.ltp / Math.exp(company.drift * days);
  let price = start;
  return dates.map((date, i) => {
    const shock = (rng() - 0.48) * company.vol;
    price = Math.max(price * (1 + company.drift + shock), 1);
    const close =
      i === dates.length - 1 ? company.fundamentals.ltp : Number(price.toFixed(2));
    if (i === dates.length - 1) price = company.fundamentals.ltp;
    return { date: date.toISOString().slice(0, 10), close };
  });
}

export function pctChange(prices: PricePoint[], lookback: number) {
  if (prices.length < lookback + 1) return 0;
  const now = prices[prices.length - 1].close;
  const then = prices[prices.length - 1 - lookback].close;
  return ((now - then) / then) * 100;
}
