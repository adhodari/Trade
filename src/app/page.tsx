import Link from "next/link";
import { CompanyTable } from "@/components/CompanyTable";
import { ActionBadge, ScorePill } from "@/components/Badges";
import { cr, pct, signedClass } from "@/lib/format";

interface AnalysisResult {
  symbol: string;
  analysis_date: string;
  foundation: number;
  valuation: number;
  momentum: number;
  action: "Accumulate" | "Hold" | "Wait" | "Avoid";
  action_why: string;
  forecast_return: number;
  forecast_price: number;
  up_probability: number;
  confidence: number;
  factors_json: string;
}

interface MarketPulse {
  names: number;
  avgFoundation: number;
  avgValuation: number;
  breadth: number;
  marketCapCr: number;
  nepse: number;
  nepseChange: number;
}

async function fetchAnalysis(): Promise<{ analyses: any[]; pulse: MarketPulse }> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
  
  // Skip API calls during build (static generation)
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
    return { analyses: [], pulse: { names: 0, avgFoundation: 0, avgValuation: 0, breadth: 0, marketCapCr: 0, nepse: 2742.18, nepseChange: 0.42 } };
  }
  
  try {
    const [analysisRes, pulseRes, indexRes] = await Promise.all([
      fetch(`${baseUrl}/api/analysis`, { next: { revalidate: 300 } }),
      fetch(`${baseUrl}/api/nepse/summary`, { next: { revalidate: 60 } }),
      fetch(`${baseUrl}/api/nepse/nepse-index`, { next: { revalidate: 60 } }),
    ]);

    if (!analysisRes.ok || !pulseRes.ok || !indexRes.ok) {
      throw new Error("API not available");
    }

    const analysisData = await analysisRes.json();
    const summaryData = await pulseRes.json();
    const indexData = await indexRes.json();

    // Calculate pulse from analysis data
    const analyses = analysisData.analyses || [];
    const avgFoundation = analyses.length > 0 
      ? analyses.reduce((acc: number, r: any) => acc + r.foundation, 0) / analyses.length 
      : 0;
    const avgValuation = analyses.length > 0
      ? analyses.reduce((acc: number, r: any) => acc + r.valuation, 0) / analyses.length
      : 0;
    const breadth = analyses.length > 0
      ? (analyses.filter((r: any) => r.foundation > 0).length / analyses.length) * 100
      : 0;
    const cap = analyses.reduce((acc: number, r: any) => acc + (STATIC_FUNDAMENTALS[r.symbol]?.marketCapCr || 0), 0);

    // Get NEPSE index
    let nepse = 2742.18;
    let nepseChange = 0.42;
    if (indexData?.["NEPSE Index"]) {
      nepse = indexData["NEPSE Index"].currentValue ?? nepse;
      nepseChange = indexData["NEPSE Index"].perChange ?? nepseChange;
    }

    const pulse: MarketPulse = {
      names: analyses.length,
      avgFoundation: Number(avgFoundation.toFixed(1)),
      avgValuation: Number(avgValuation.toFixed(1)),
      breadth: Number(breadth.toFixed(0)),
      marketCapCr: Math.round(cap),
      nepse,
      nepseChange,
    };

    return { analyses, pulse };
  } catch (error) {
    console.warn("[Home] API not available, using fallback data:", error);
    return { analyses: [], pulse: { names: 0, avgFoundation: 0, avgValuation: 0, breadth: 0, marketCapCr: 0, nepse: 2742.18, nepseChange: 0.42 } };
  }
}

// Import static fundamentals for market cap lookup
interface StaticFundamentals {
  marketCapCr: number;
  sector?: string;
}

const STATIC_FUNDAMENTALS: Record<string, StaticFundamentals> = {
  NABIL: { marketCapCr: 13540 },
  SCB: { marketCapCr: 5920 },
  GBIME: { marketCapCr: 9020 },
  NICA: { marketCapCr: 4760 },
  NTC: { marketCapCr: 16520 },
  UNL: { marketCapCr: 16780 },
  BNL: { marketCapCr: 2610 },
  HDL: { marketCapCr: 2090 },
  SHIVM: { marketCapCr: 2150 },
  CHCL: { marketCapCr: 2620 },
  UPPER: { marketCapCr: 2300 },
  NLIC: { marketCapCr: 3880 },
  OHL: { marketCapCr: 1060 },
  HIDCL: { marketCapCr: 4160 },
  NIFRA: { marketCapCr: 5520 },
  CIT: { marketCapCr: 2570 },
};

export default async function Home() {
  const { analyses, pulse } = await fetchAnalysis();
  
  // Convert to format expected by UI components
  const fullAnalysisRows = analyses.map((a: any) => ({
    company: {
      symbol: a.symbol,
      name: a.symbol, // Will be enhanced if needed
      sector: (STATIC_FUNDAMENTALS[a.symbol] as StaticFundamentals)?.sector || "Others",
      fundamentals: {
        pe: 0, pb: 0, eps: 0, bookValue: 0, roe: 0, roa: 0,
        dividendYield: 0, payout: 0, debtToEquity: 0,
        profitGrowth3y: 0, revenueGrowth3y: 0, paidUpCr: 0,
      }
    },
    foundation: a.foundation,
    valuation: a.valuation,
    momentum: a.momentum,
    action: a.action,
    actionWhy: a.action_why,
    forecast: {
      expectedReturn: a.forecast_return,
      expectedPrice: a.forecast_price,
      low: 0, high: 0,
      upProbability: a.up_probability,
      confidence: a.confidence,
      method: "Pre-computed EOD analysis"
    }
  }));

  const accumulate = fullAnalysisRows.filter((r) => r.action === "Accumulate");
  const qualityCheap = [...fullAnalysisRows]
    .filter((r) => r.foundation >= 60)
    .sort((a, b) => b.valuation - a.valuation)
    .slice(0, 4);
  const forecasts = [...fullAnalysisRows].sort(
    (a, b) => b.forecast.expectedReturn - a.forecast.expectedReturn,
  );

  // Light live data for universe table
  const { getAllLiveStocksLight } = await import("@/lib/analyze");
  const allLiveRows = await getAllLiveStocksLight();

  return (
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-800">
            Nepal Stock Exchange
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-emerald-950 sm:text-5xl">
            Decide on the company first.
            <span className="block text-stone-500">Then glance at the tape.</span>
          </h1>
          <p className="mt-4 max-w-xl text-stone-600">
            NEPSE Invest scores listed names on profitability, growth, capital, dividends,
            and governance. A 20-session forecast sits on top of that — useful for timing,
            never a reason to own a weak franchise.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-stone-200 bg-white/70 p-4">
            <div className="text-xs uppercase tracking-wider text-stone-500">NEPSE</div>
            <div className="font-serif text-3xl">{pulse.nepse.toFixed(2)}</div>
            <div className={`text-sm ${signedClass(pulse.nepseChange)}`}>
              {pct(pulse.nepseChange)} (live)
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white/70 p-4">
            <div className="text-xs uppercase tracking-wider text-stone-500">Coverage cap</div>
            <div className="font-serif text-2xl leading-tight">{cr(pulse.marketCapCr)}</div>
            <div className="text-sm text-stone-500">{pulse.names} names ({fullAnalysisRows.length} full analysis)</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white/70 p-4">
            <ScorePill label="Avg foundation" value={pulse.avgFoundation} />
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white/70 p-4">
            <div className="text-xs uppercase tracking-wider text-stone-500">1D breadth</div>
            <div className="font-serif text-3xl">{pulse.breadth}%</div>
            <div className="text-sm text-stone-500">names up today</div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-2xl text-emerald-950">Foundation-first ideas</h2>
          <Link href="/screener" className="text-sm text-emerald-800 hover:underline">
            Open screener
          </Link>
        </div>
        {accumulate.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accumulate.slice(0, 3).map((r) => (
              <Link
                key={r.company.symbol}
                href={`/companies/${r.company.symbol}`}
                className="rounded-2xl border border-stone-200 bg-white/80 p-4 hover:border-emerald-800"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.company.symbol}</span>
                  <ActionBadge action={r.action} />
                </div>
                <p className="mt-1 text-sm text-stone-500">{r.company.sector}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] uppercase text-stone-400">Found.</div>
                    <div className="font-serif text-xl">{r.foundation.toFixed(0)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-stone-400">Value</div>
                    <div className="font-serif text-xl">{r.valuation.toFixed(0)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-stone-400">PE</div>
                    <div className="font-serif text-xl">
                      {r.company.fundamentals.pe.toFixed(1)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500">
            No Accumulate names in this snapshot. Check Hold/Wait in the screener.
          </p>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-serif text-2xl text-emerald-950">Quality, cheaper vs sector</h2>
          <ul className="space-y-2">
            {qualityCheap.map((r) => (
              <li key={r.company.symbol}>
                <Link
                  href={`/companies/${r.company.symbol}`}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-white/70 px-4 py-3 hover:border-emerald-800"
                >
                  <div>
                    <div className="font-medium">{r.company.symbol}</div>
                    <div className="text-xs text-stone-500">{r.company.name}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div>Foundation {r.foundation.toFixed(0)}</div>
                    <div className="text-stone-500">Value {r.valuation.toFixed(0)}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-serif text-2xl text-emerald-950">20-session model</h2>
          <p className="mb-3 text-xs text-stone-500">
            Ranked by expected return. Ignore this table if foundation is weak.
          </p>
          <ul className="space-y-2">
            {forecasts.slice(0, 5).map((r) => (
              <li
                key={r.company.symbol}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white/70 px-4 py-3 text-sm"
              >
                <Link href={`/companies/${r.company.symbol}`} className="font-medium hover:underline">
                  {r.company.symbol}
                </Link>
                <span className={signedClass(r.forecast.expectedReturn)}>
                  {pct(r.forecast.expectedReturn)} · {r.forecast.upProbability.toFixed(0)}% up
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-2xl text-emerald-950">
          Universe ({allLiveRows.length} live stocks)
        </h2>
        <CompanyTable rows={allLiveRows} />
      </section>
    </div>
  );
}