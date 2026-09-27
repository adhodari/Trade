"use client";

import { useMemo, useState } from "react";
import { CompanyTable } from "@/components/CompanyTable";
import { SECTORS, type Action, type CompanyAnalysis, type Sector } from "@/lib/types";

const ACTIONS: Action[] = ["Accumulate", "Hold", "Wait", "Avoid"];

// Light row type for screener - union of full analysis and light data
type ScreenerRow = CompanyAnalysis | {
  company: CompanyAnalysis["company"];
  change1d: number;
  ltp: number;
  volume: number;
  momentum: number;
  action: "Accumulate" | "Hold" | "Wait" | "Avoid";
  foundation?: number;
  valuation?: number;
  prices?: CompanyAnalysis["prices"];
  change1m?: number;
  change3m?: number;
  change6m?: number;
  factors?: CompanyAnalysis["factors"];
  actionWhy?: string;
  forecast?: CompanyAnalysis["forecast"];
};

export function Screener({ rows }: { rows: ScreenerRow[] }) {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState<Sector | "All">("All");
  const [action, setAction] = useState<Action | "All">("All");
  const [minFound, setMinFound] = useState(0);
  const [minMomentum, setMinMomentum] = useState(0);
  const [showFullOnly, setShowFullOnly] = useState(false);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const hay = `${r.company.symbol} ${r.company.name}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (sector !== "All" && r.company.sector !== sector) return false;
      if (action !== "All" && (r.action ?? "Wait") !== action) return false;
      
      // Foundation filter: only apply to stocks with full analysis (foundation > 0)
      const hasFullData = (r.foundation ?? 0) > 0;
      if (showFullOnly && !hasFullData) return false;
      if (hasFullData && (r.foundation ?? 0) < minFound) return false;
      
      // Momentum filter applies to all
      if ((r.momentum ?? 0) < minMomentum) return false;
      
      return true;
    });
  }, [rows, q, sector, action, minFound, minMomentum, showFullOnly]);

  const fullAnalysisCount = rows.filter(r => (r.foundation ?? 0) > 0).length;
  const liveOnlyCount = rows.filter(r => (r.foundation ?? 0) === 0).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-xs uppercase tracking-wider text-stone-500">
          Search
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="NABIL, Unilever…"
            className="mt-1 w-full rounded-lg border border-stone-200 bg-[#fbf8f2] px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-700"
          />
        </label>
        <label className="text-xs uppercase tracking-wider text-stone-500">
          Sector
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value as Sector | "All")}
            className="mt-1 w-full rounded-lg border border-stone-200 bg-[#fbf8f2] px-3 py-2 text-sm outline-none focus:border-emerald-700"
          >
            <option>All</option>
            {SECTORS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-xs uppercase tracking-wider text-stone-500">
          Call
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as Action | "All")}
            className="mt-1 w-full rounded-lg border border-stone-200 bg-[#fbf8f2] px-3 py-2 text-sm outline-none focus:border-emerald-700"
          >
            <option>All</option>
            {ACTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-xs uppercase tracking-wider text-stone-500">
          Min Foundation {minFound}
          <input
            type="range"
            min={0}
            max={80}
            step={5}
            value={minFound}
            onChange={(e) => setMinFound(Number(e.target.value))}
            className="mt-3 w-full"
          />
        </label>
        <label className="text-xs uppercase tracking-wider text-stone-500">
          Min Momentum {minMomentum}
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minMomentum}
            onChange={(e) => setMinMomentum(Number(e.target.value))}
            className="mt-3 w-full"
          />
        </label>
        <label className="flex items-end">
          <input
            type="checkbox"
            checked={showFullOnly}
            onChange={(e) => setShowFullOnly(e.target.checked)}
            className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="ml-2 text-xs text-stone-500">Full analysis only ({fullAnalysisCount})</span>
        </label>
      </div>
      <p className="text-sm text-stone-500">
        {filtered.length} of {rows.length} names ({fullAnalysisCount} full analysis, {liveOnlyCount} live-only)
      </p>
      <CompanyTable rows={filtered as any} />
    </div>
  );
}