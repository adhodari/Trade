import Link from "next/link";
import { ActionBadge } from "@/components/Badges";
import { Sparkline } from "@/components/Charts";
import { npr, pct, signedClass } from "@/lib/format";
import type { CompanyAnalysis } from "@/lib/types";

export function CompanyTable({ rows }: { rows: CompanyAnalysis[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white/70">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500">
          <tr>
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-3 py-3 font-medium">LTP</th>
            <th className="px-3 py-3 font-medium">1D</th>
            <th className="px-3 py-3 font-medium">Foundation</th>
            <th className="px-3 py-3 font-medium">Value</th>
            <th className="px-3 py-3 font-medium">20d outlook</th>
            <th className="px-3 py-3 font-medium">Call</th>
            <th className="px-3 py-3 font-medium">Tape</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.company.symbol} className="border-b border-stone-100 last:border-0">
              <td className="px-4 py-3">
                <Link href={`/companies/${r.company.symbol}`} className="hover:underline">
                  <div className="font-medium text-emerald-950">{r.company.symbol}</div>
                  <div className="text-xs text-stone-500">{r.company.name}</div>
                </Link>
              </td>
              <td className="px-3 py-3 tabular-nums">{npr(r.company.fundamentals.ltp)}</td>
              <td className={`px-3 py-3 tabular-nums ${signedClass(r.change1d)}`}>
                {pct(r.change1d)}
              </td>
              <td className="px-3 py-3 tabular-nums font-medium">{r.foundation.toFixed(0)}</td>
              <td className="px-3 py-3 tabular-nums">{r.valuation.toFixed(0)}</td>
              <td className={`px-3 py-3 tabular-nums ${signedClass(r.forecast.expectedReturn)}`}>
                {pct(r.forecast.expectedReturn)}
              </td>
              <td className="px-3 py-3">
                <ActionBadge action={r.action} />
              </td>
              <td className="px-3 py-3">
                <Sparkline values={r.prices.slice(-40).map((p) => p.close)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
