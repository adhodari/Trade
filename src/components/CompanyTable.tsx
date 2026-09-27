import Link from "next/link";
import { ActionBadge } from "@/components/Badges";
import { Sparkline } from "@/components/Charts";
import { npr, pct, signedClass } from "@/lib/format";
import type { CompanyAnalysis, Action } from "@/lib/types";

type BasicLiveStock = {
  company: { symbol: string; name: string; sector: string; fundamentals: { ltp: number } };
  change1d: number;
  ltp: number;
  volume: number;
  momentum: number;
  action: Action;
};

type TableRow = CompanyAnalysis | BasicLiveStock;

function isFullAnalysis(row: TableRow): row is CompanyAnalysis {
  return "foundation" in row && "valuation" in row && "forecast" in row;
}

function hasAnalysisData(row: TableRow): row is CompanyAnalysis & { foundation: number; valuation: number } {
  return "foundation" in row && "valuation" in row;
}

export function CompanyTable({ rows }: { rows: TableRow[] }) {
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
          {rows.map((r) => {
            const full = isFullAnalysis(r);
            const hasData = hasAnalysisData(r);
            const ltp = "ltp" in r ? r.ltp : r.company.fundamentals.ltp;
            const change1d = r.change1d ?? 0;
            const foundation = hasData ? r.foundation.toFixed(0) : "—";
            const valuation = hasData ? r.valuation.toFixed(0) : "—";
            const outlook = hasData ? pct(r.forecast.expectedReturn) : "—";
            const action = r.action ?? null;
            const sparkValues = full ? r.prices.slice(-40).map((p) => p.close) : [];

            return (
              <tr key={r.company.symbol} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/companies/${r.company.symbol}`} className="hover:underline">
                    <div className="font-medium text-emerald-950">{r.company.symbol}</div>
                    <div className="text-xs text-stone-500">{r.company.name}</div>
                  </Link>
                </td>
                <td className="px-3 py-3 tabular-nums">{npr(ltp)}</td>
                <td className={`px-3 py-3 tabular-nums ${signedClass(change1d)}`}>
                  {pct(change1d)}
                </td>
                <td className="px-3 py-3 tabular-nums font-medium">{foundation}</td>
                <td className="px-3 py-3 tabular-nums">{valuation}</td>
                <td className={`px-3 py-3 tabular-nums ${hasData ? signedClass(r.forecast.expectedReturn) : "text-stone-400"}`}>
                  {outlook}
                </td>
                <td className="px-3 py-3">
                  {action ? <ActionBadge action={action} /> : <span className="text-stone-400">—</span>}
                </td>
                <td className="px-3 py-3">
                  {sparkValues.length > 0 ? <Sparkline values={sparkValues} /> : <span className="text-stone-400">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}