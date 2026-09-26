import type { Action } from "@/lib/types";

const styles: Record<Action, string> = {
  Accumulate: "bg-emerald-800 text-emerald-50",
  Hold: "bg-amber-100 text-amber-950",
  Wait: "bg-stone-200 text-stone-800",
  Avoid: "bg-rose-800 text-rose-50",
};

export function ActionBadge({ action }: { action: Action }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide ${styles[action]}`}
    >
      {action}
    </span>
  );
}

export function ScorePill({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const tone =
    value >= 70 ? "text-emerald-800" : value >= 50 ? "text-amber-800" : "text-rose-800";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-stone-500">{label}</span>
      <span className={`font-serif text-lg ${tone}`}>{value.toFixed(0)}</span>
    </div>
  );
}
