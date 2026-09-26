import { Screener } from "@/components/Screener";
import { analyzeAll } from "@/lib/analyze";

export default function ScreenerPage() {
  const rows = analyzeAll();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl text-emerald-950">Screener</h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Filter the research universe by sector, foundation score, and the
          action the model would take. Click a ticker for the full scorecard.
        </p>
      </div>
      <Screener rows={rows} />
    </div>
  );
}
