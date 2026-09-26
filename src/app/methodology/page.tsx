export default function MethodologyPage() {
  return (
    <article className="max-w-2xl space-y-6 text-stone-700">
      <h1 className="font-serif text-4xl text-emerald-950">How it scores</h1>
      <p>
        NEPSE is noisy: hydropower IPOs, rumor days, and bonus-share calendars move
        prices faster than earnings. This desk is built so you underwrite the{" "}
        <em>company</em> before you underwrite the quote.
      </p>
      <h2 className="font-serif text-2xl text-emerald-950">Foundation (0–100)</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Profitability 32% — ROE vs ~18% good / ~6% poor; ROA scaled for banks vs industrials.</li>
        <li>Growth 18% — 3-year profit and revenue CAGR.</li>
        <li>Balance sheet 22% — NPL and CAR for banks; debt/equity otherwise.</li>
        <li>Payout 13% — dividend yield and a capped payout ratio (high payout with no yield scores poorly).</li>
        <li>Governance 15% — strong / average / weak from the research note.</li>
      </ul>
      <h2 className="font-serif text-2xl text-emerald-950">Valuation</h2>
      <p>
        P/E and P/B versus the median of the same sector in this universe. A 25× FMCG
        multiple can still score as “fair” if peers are 28×; a 27× hydro with 7% ROE
        will not.
      </p>
      <h2 className="font-serif text-2xl text-emerald-950">Action</h2>
      <p>
        Weak foundation (&lt;42) is always Avoid. High quality plus cheap versus sector
        is Accumulate. High quality plus expensive is Wait. Momentum never overrides a
        bad book.
      </p>
      <h2 className="font-serif text-2xl text-emerald-950">20-session forecast</h2>
      <p>
        Ordinary least squares trend on the last 60 closes, blended 45% toward the
        90-day mean, then a small tilt from foundation and valuation. Bands use
        realized daily volatility. Probability of an up move is a logistic of those
        pieces. It is a transparent toy model — not a neural net, and not a promise.
      </p>
      <h2 className="font-serif text-2xl text-emerald-950">Data</h2>
      <p>
        Today the universe is a 16-name research snapshot with internally consistent
        fundamentals and simulated paths that pin to the stated LTP. Next step is a
        live adapter (NEPSE / ShareSansar / company filings) so scores recompute on
        real closes.
      </p>
    </article>
  );
}
