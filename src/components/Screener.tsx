"use client";

import { useMemo, useState } from "react";
import { CompanyTable } from "@/components/CompanyTable";
import { SECTORS, type Action, type CompanyAnalysis, type Sector } from "@/lib/types";

const ACTIONS: Action[] = ["Accumulate", "Hold", "Wait", "Avoid"];

export function Screener({ rows }: { rows: CompanyAnalysis[] }) {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState<Sector | "All">("All");
  const [action, setAction] = useState<Action | "All">("All");
  const [minFound, setMinFound] = useState(0);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const hay = `${r.company.symbol} ${r.company.name}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (sector !== "All" && r.company.sector !== sector) return false;
      if (action !== "All" && r.action !== action) return false;
      if (r.foundation < minFound) return false;
      return true;
    });
  }, [rows, q, sector, action, minFound]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
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
          Min foundation {minFound}
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
      </div>
      <p className="text-sm text-stone-500">
        {filtered.length} of {rows.length} names
      </p>
      <CompanyTable rows={filtered} />
    </div>
  );
}
