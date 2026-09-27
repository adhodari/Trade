import { NextResponse } from "next/server";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const DB_PATH = "/home/dell/Documents/Trade_repo/data/eod_analysis.db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  try {
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY,
    });

    if (symbol) {
      // Single symbol analysis
      const row = await db.get(
        `SELECT * FROM analysis_results WHERE symbol = ? AND analysis_date = ?`,
        [symbol.toUpperCase(), date]
      );

      if (!row) {
        return NextResponse.json(
          { error: "Analysis not found for symbol", symbol, date },
          { status: 404 }
        );
      }

      // Also get price history for charts
      const prices = await db.all(
        `SELECT date, close FROM eod_prices WHERE symbol = ? ORDER BY date DESC LIMIT 180`,
        [symbol.toUpperCase()]
      );

      return NextResponse.json({
        ...row,
        factors: JSON.parse(row.factors_json || "{}"),
        priceHistory: prices.reverse().map(p => ({ date: p.date, close: p.close }))
      });
    } else {
      // All symbols - return summary
      const rows = await db.all(
        `SELECT symbol, analysis_date, foundation, valuation, momentum, action, 
                forecast_return, forecast_price, up_probability, confidence
         FROM analysis_results 
         WHERE analysis_date = ?
         ORDER BY foundation DESC`,
        [date]
      );

      // Get metadata
      const meta = await db.all("SELECT key, value FROM analysis_metadata");

      return NextResponse.json({
        date,
        count: rows.length,
        metadata: Object.fromEntries(meta.map(m => [m.key, m.value])),
        analyses: rows
      });
    }
  } catch (error) {
    console.error("[Analysis API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analysis", details: String(error) },
      { status: 500 }
    );
  }
}