import Link from "next/link";
import { CompanyTable } from "@/components/CompanyTable";
import { ActionBadge, ScorePill } from "@/components/Badges";
import { analyzeAll, marketPulse } from "@/lib/analyze";
import { cr, pct, signedClass } from "@/lib/format";

export default function Home() {
  const rows = analyzeAll();
  const pulse = marketPulse(rows);
  const accumulate = rows.filter((r) => r.action === "Accumulate");
  const qualityCheap = [...rows]
    .filter((r) => r.foundation >= 60)
    .sort((a, b) => b.valuation - a.valuation)
    .slice(0, 4);
  const forecasts = [...rows].sort(
    (a, b) => b.forecast.expectedReturn - a.forecast.expectedReturn,
  );

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
              {pct(pulse.nepseChange)} (illustrative)
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white/70 p-4">
            <div className="text-xs uppercase tracking-wider text-stone-500">Coverage cap</div>
            <div className="font-serif text-2xl leading-tight">{cr(pulse.marketCapCr)}</div>
            <div className="text-sm text-stone-500">{pulse.names} names</div>
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
        <h2 className="mb-3 font-serif text-2xl text-emerald-950">Universe</h2>
        <CompanyTable rows={rows} />
      </section>
    </div>
  );
}
