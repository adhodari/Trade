import { Screener } from "@/components/Screener";
import { getAllLiveStocksLight } from "@/lib/analyze";

export default async function ScreenerPage() {
  // Light version for fast initial load
  const rows = await getAllLiveStocksLight();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl text-emerald-950">Screener</h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Filter all NEPSE stocks by sector, momentum, and action.
          Full fundamental analysis available for 16 major stocks; others show momentum-based metrics.
        </p>
      </div>
      <Screener rows={rows} />
    </div>
  );
}