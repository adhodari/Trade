import type { FactorScores } from "@/lib/types";

const labels: Record<keyof FactorScores, string> = {
  profitability: "Profitability (ROE / ROA)",
  growth: "3-year growth",
  balanceSheet: "Balance sheet / asset quality",
  payout: "Dividend capacity",
  governance: "Governance",
};

export function FactorBars({ factors }: { factors: FactorScores }) {
  return (
    <dl className="space-y-3">
      {(Object.keys(labels) as (keyof FactorScores)[]).map((key) => (
        <div key={key}>
          <div className="mb-1 flex justify-between text-xs text-stone-600">
            <dt>{labels[key]}</dt>
            <dd className="tabular-nums">{factors[key].toFixed(0)}</dd>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-emerald-800"
              style={{ width: `${factors[key]}%` }}
            />
          </div>
        </div>
      ))}
    </dl>
  );
}
