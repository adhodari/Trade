import { NextResponse } from "next/server";

const NEPSE_API_BASE = process.env.NEPSE_API_BASE || "http://localhost:8000";

export async function GET() {
  try {
    console.log("[API] Fetching market-data from:", NEPSE_API_BASE);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(`${NEPSE_API_BASE}/api/trade-turnover-transaction-subindices`, {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log("[API] Market-data response status:", response.status);
    
    if (!response.ok) throw new Error(`NEPSE API error: ${response.status}`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Market-data error:", error);
    return NextResponse.json({ error: "Failed to fetch market data", details: String(error) }, { status: 500 });
  }
}