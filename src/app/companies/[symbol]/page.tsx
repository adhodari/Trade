import { COMPANIES } from "@/lib/data/companies";
import { analyzeCompany, getCompany } from "@/lib/analyze";
import { ActionBadge, ScorePill } from "@/components/Badges";
import { AreaChart } from "@/components/Charts";
import { FactorBars } from "@/components/FactorBars";
import { cr, npr, pct, signedClass } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";

export function generateStaticParams() {
  return COMPANIES.map((c) => ({ symbol: c.symbol }));
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const company = await getCompany(symbol);
  if (!company) notFound();
  const r = await analyzeCompany(company);
  const f = company.fundamentals;

  const metrics = [
    ["P/E", f.pe.toFixed(1)],
    ["P/B", f.pb.toFixed(1)],
    ["EPS", npr(f.eps, 1)],
    ["Book value", npr(f.bookValue)],
    ["ROE", `${f.roe.toFixed(1)}%`],
    ["ROA", `${f.roa.toFixed(1)}%`],
    ["Div. yield", `${f.dividendYield.toFixed(1)}%`],
    ["Payout", `${f.payout.toFixed(0)}%`],
    ["3y profit CAGR", `${f.profitGrowth3y.toFixed(1)}%`],
    ["3y revenue CAGR", `${f.revenueGrowth3y.toFixed(1)}%`],
    ["D/E", f.debtToEquity.toFixed(2)],
    ["Market cap", cr(f.marketCapCr)],
    ...(f.npl !== undefined ? ([["NPL", `${f.npl.toFixed(1)}%`]] as const) : []),
    ...(f.car !== undefined ? ([["CAR", `${f.car.toFixed(1)}%`]] as const) : []),
    ...(f.capacityMw !== undefined
      ? ([["Capacity", `${f.capacityMw} MW`]] as const)
      : []),
  ] as [string, string][];

  return (
    <div className="space-y-8">
      <Link href="/screener" className="text-sm text-emerald-800 hover:underline">
        ← Screener
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
            {company.sector} · listed {company.listed}
          </p>
          <h1 className="mt-1 font-serif text-4xl text-emerald-950">{company.symbol}</h1>
          <p className="text-stone-600">{company.name}</p>
        </div>
        <div className="text-right">
          <div className="font-serif text-4xl">{npr(f.ltp)}</div>
          <div className={`text-sm ${signedClass(r.change1d)}`}>{pct(r.change1d)} today</div>
          <div className="mt-2">
            <ActionBadge action={r.action} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-5 lg:col-span-2">
          <h2 className="font-serif text-xl">Price and 20-session band</h2>
          <AreaChart
            values={r.prices.map((p) => p.close)}
            forecast={{
              expected: r.forecast.expectedPrice,
              low: r.forecast.low,
              high: r.forecast.high,
            }}
          />
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <div className="text-xs text-stone-500">Expected</div>
              <div className={signedClass(r.forecast.expectedReturn)}>
                {npr(r.forecast.expectedPrice, 2)} ({pct(r.forecast.expectedReturn)})
              </div>
            </div>
            <div>
              <div className="text-xs text-stone-500">Range</div>
              {npr(r.forecast.low, 2)} – {npr(r.forecast.high, 2)}
            </div>
            <div>
              <div className="text-xs text-stone-500">P(up)</div>
              {r.forecast.upProbability.toFixed(0)}%
            </div>
            <div>
              <div className="text-xs text-stone-500">Confidence</div>
              {r.forecast.confidence.toFixed(0)} / 100
            </div>
          </div>
          <p className="mt-3 text-xs text-stone-500">{r.forecast.method}</p>
        </div>
        <div className="space-y-4 rounded-2xl border border-stone-200 bg-white/80 p-5">
          <ScorePill label="Foundation" value={r.foundation} />
          <ScorePill label="Valuation vs sector" value={r.valuation} />
          <ScorePill label="Momentum" value={r.momentum} />
          <p className="text-sm text-stone-600">{r.actionWhy}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-5">
          <h2 className="mb-4 font-serif text-xl">Foundation factors</h2>
          <FactorBars factors={r.factors} />
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-5">
          <h2 className="mb-4 font-serif text-xl">The business</h2>
          <p className="text-sm leading-6 text-stone-700">{company.business}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-xs uppercase tracking-wider text-emerald-800">Strengths</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-stone-700">
                {company.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wider text-rose-800">Risks</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-stone-700">
                {company.risks.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-xs text-stone-500">
            Governance: {company.governance} · promoter / government holding{" "}
            {company.promoterHolding}%
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white/80 p-5">
        <h2 className="mb-4 font-serif text-xl">Key figures</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
          {metrics.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs uppercase tracking-wider text-stone-500">{k}</dt>
              <dd className="tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-stone-500">
          1M {pct(r.change1m)} · 3M {pct(r.change3m)} · 6M {pct(r.change6m)}
        </p>
      </div>
    </div>
  );
}
