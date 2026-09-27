#!/usr/bin/env python3
"""
EOD Historical Analysis Engine
Fetches 4 months of EOD data, computes full analysis, and stores results.
Runs daily at 8 PM NPT via cron.
"""

import os
import sys
import json
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
import pandas as pd
import numpy as np
from nepse import Nepse

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/home/dell/Documents/Trade_repo/logs/eod-analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration
DB_PATH = '/home/dell/Documents/Trade_repo/data/eod_analysis.db'
NEPSE_API_BASE = 'http://localhost:8000'
LOOKBACK_DAYS = 120  # ~4 months trading days
ANALYSIS_DATE = datetime.now().replace(hour=20, minute=0, second=0, microsecond=0)

# Static fundamentals (from existing repo)
STATIC_FUNDAMENTALS = {
    "NABIL": {"pe": 12.5, "pb": 1.78, "eps": 39.8, "bookValue": 280, "roe": 14.2, "roa": 1.6, "dividendYield": 4.2, "payout": 52, "debtToEquity": 0, "profitGrowth3y": 9.4, "revenueGrowth3y": 8.1, "paidUpCr": 2710, "npl": 1.4, "car": 13.8, "marketCapCr": 13540, "sector": "Commercial Bank"},
    "SCB": {"pe": 11.9, "pb": 1.76, "eps": 52.0, "bookValue": 351, "roe": 14.8, "roa": 1.9, "dividendYield": 5.1, "payout": 60, "debtToEquity": 0, "profitGrowth3y": 6.2, "revenueGrowth3y": 5.4, "paidUpCr": 957, "npl": 0.6, "car": 16.4, "marketCapCr": 5920, "sector": "Commercial Bank"},
    "GBIME": {"pe": 13.2, "pb": 1.64, "eps": 18.0, "bookValue": 145, "roe": 12.4, "roa": 1.3, "dividendYield": 3.6, "payout": 48, "debtToEquity": 0, "profitGrowth3y": 11.0, "revenueGrowth3y": 14.2, "paidUpCr": 3790, "npl": 2.1, "car": 12.6, "marketCapCr": 9020, "sector": "Commercial Bank"},
    "NICA": {"pe": 18.7, "pb": 2.58, "eps": 22.0, "bookValue": 160, "roe": 13.8, "roa": 1.2, "dividendYield": 2.4, "payout": 45, "debtToEquity": 0, "profitGrowth3y": 7.1, "revenueGrowth3y": 9.8, "paidUpCr": 1156, "npl": 2.8, "car": 12.1, "marketCapCr": 4760, "sector": "Commercial Bank"},
    "NTC": {"pe": 13.5, "pb": 1.8, "eps": 68.0, "bookValue": 510, "roe": 13.3, "roa": 8.4, "dividendYield": 5.8, "payout": 78, "debtToEquity": 0.12, "profitGrowth3y": 4.6, "revenueGrowth3y": 3.2, "paidUpCr": 1800, "marketCapCr": 16520, "sector": "Telecom"},
    "UNL": {"pe": 25.3, "pb": 7.6, "eps": 721, "bookValue": 2400, "roe": 30.0, "roa": 18.5, "dividendYield": 2.1, "payout": 53, "debtToEquity": 0.05, "profitGrowth3y": 12.8, "revenueGrowth3y": 9.4, "paidUpCr": 92, "marketCapCr": 16780, "sector": "Manufacturing"},
    "BNL": {"pe": 28.1, "pb": 7.5, "eps": 480, "bookValue": 1800, "roe": 26.7, "roa": 16.2, "dividendYield": 1.6, "payout": 45, "debtToEquity": 0.22, "profitGrowth3y": 10.2, "revenueGrowth3y": 8.7, "paidUpCr": 19.4, "marketCapCr": 2610, "sector": "Manufacturing"},
    "HDL": {"pe": 15.5, "pb": 3.32, "eps": 90.0, "bookValue": 420, "roe": 21.4, "roa": 12.1, "dividendYield": 2.8, "payout": 43, "debtToEquity": 0.35, "profitGrowth3y": 15.6, "revenueGrowth3y": 11.2, "paidUpCr": 150, "marketCapCr": 2090, "sector": "Manufacturing"},
    "SHIVM": {"pe": 19.2, "pb": 2.99, "eps": 28.0, "bookValue": 180, "roe": 15.6, "roa": 7.8, "dividendYield": 2.2, "payout": 42, "debtToEquity": 0.48, "profitGrowth3y": 3.4, "revenueGrowth3y": 5.1, "paidUpCr": 400, "marketCapCr": 2150, "sector": "Manufacturing"},
    "CHCL": {"pe": 14.9, "pb": 1.9, "eps": 32.0, "bookValue": 250, "roe": 12.8, "roa": 6.4, "dividendYield": 3.9, "payout": 58, "debtToEquity": 0.62, "profitGrowth3y": 5.5, "revenueGrowth3y": 4.1, "paidUpCr": 550, "marketCapCr": 2620, "sector": "Hydropower"},
    "UPPER": {"pe": 27.3, "pb": 1.98, "eps": 8.0, "bookValue": 110, "roe": 7.3, "roa": 3.1, "dividendYield": 1.1, "payout": 30, "debtToEquity": 1.15, "profitGrowth3y": -2.4, "revenueGrowth3y": 1.8, "paidUpCr": 1059, "marketCapCr": 2300, "sector": "Hydropower"},
    "NLIC": {"pe": 22.2, "pb": 2.43, "eps": 35.0, "bookValue": 319, "roe": 11.0, "roa": 1.4, "dividendYield": 1.8, "payout": 40, "debtToEquity": 0, "profitGrowth3y": 8.3, "revenueGrowth3y": 10.5, "paidUpCr": 500, "marketCapCr": 3880, "sector": "Life Insurance"},
    "OHL": {"pe": 47.1, "pb": 4.24, "eps": 18.0, "bookValue": 200, "roe": 9.0, "roa": 4.2, "dividendYield": 0.6, "payout": 28, "debtToEquity": 0.55, "profitGrowth3y": 18.0, "revenueGrowth3y": 16.4, "paidUpCr": 125, "marketCapCr": 1060, "sector": "Hotels & Tourism"},
    "HIDCL": {"pe": 23.1, "pb": 1.73, "eps": 9.0, "bookValue": 120, "roe": 7.5, "roa": 5.8, "dividendYield": 2.9, "payout": 67, "debtToEquity": 0.08, "profitGrowth3y": 6.0, "revenueGrowth3y": 5.2, "paidUpCr": 2000, "marketCapCr": 4160, "sector": "Investment"},
    "NIFRA": {"pe": 23.0, "pb": 1.97, "eps": 12.0, "bookValue": 140, "roe": 8.6, "roa": 2.4, "dividendYield": 2.0, "payout": 46, "debtToEquity": 0, "profitGrowth3y": 7.7, "revenueGrowth3y": 9.0, "paidUpCr": 2000, "marketCapCr": 5520, "sector": "Investment"},
    "CIT": {"pe": 15.0, "pb": 2.21, "eps": 140, "bookValue": 948, "roe": 14.8, "roa": 9.6, "dividendYield": 3.3, "payout": 50, "debtToEquity": 0, "profitGrowth3y": 8.8, "revenueGrowth3y": 7.4, "paidUpCr": 123, "marketCapCr": 2570, "sector": "Investment"},
}

FULL_ANALYSIS_SYMBOLS = list(STATIC_FUNDAMENTALS.keys())


def init_db():
    """Initialize SQLite database with analysis tables."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS eod_prices (
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            volume INTEGER,
            PRIMARY KEY (symbol, date)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analysis_results (
            symbol TEXT NOT NULL,
            analysis_date TEXT NOT NULL,
            foundation REAL,
            valuation REAL,
            momentum REAL,
            action TEXT,
            action_why TEXT,
            forecast_return REAL,
            forecast_price REAL,
            up_probability REAL,
            confidence REAL,
            factors_json TEXT,
            PRIMARY KEY (symbol, analysis_date)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analysis_metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    
    conn.commit()
    return conn


def fetch_historical_prices(symbol: str, days: int = LOOKBACK_DAYS) -> List[Dict]:
    """Fetch historical EOD prices for a symbol."""
    try:
        from nepse import Nepse
        nepse = Nepse()
        nepse.setTLSVerification(False)
        
        # Use the daily price graph endpoint
        data = nepse.getDailyScripPriceGraph(symbol)
        
        if not data:
            logger.warning(f"No historical data for {symbol}")
            return []
        
        logger.info(f"Raw data for {symbol}: type={type(data)}, len={len(data) if hasattr(data, '__len__') else 'N/A'}")
        if data and len(data) > 0:
            logger.info(f"First item: {data[0]}")
        
        # Transform to standard format - handle different response formats
        prices = []
        for item in data:
            try:
                # Handle different possible formats:
                # Format 1: [date, open, high, low, close, volume]
                # Format 2: {"date": ..., "open": ..., ...}
                # Format 3: [date, close] only
                
                if isinstance(item, dict):
                    # Check for contract data format: {contractRate, time, contractQuantity}
                    if 'contractRate' in item and 'time' in item:
                        # Convert Unix timestamp to date
                        try:
                            timestamp = int(item['time'])
                            from datetime import datetime
                            date_str = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d')
                            rate = float(item.get('contractRate', 0))
                            qty_val = item.get('contractQuantity')
                            qty = int(qty_val) if qty_val is not None else 0
                            prices.append({
                                'date': date_str,
                                'open': 0,
                                'high': 0,
                                'low': 0,
                                'close': rate,
                                'volume': qty
                            })
                        except Exception as e:
                            logger.debug(f"Error parsing contract data for {symbol}: {e}")
                            continue
                    # Object format
                    elif 'date' in item or 'tradingDate' in item or 'close' in item or 'lastTradedPrice' in item:
                        prices.append({
                            'date': str(item.get('date') or item.get('tradingDate') or ''),
                            'open': float(item.get('open', 0)),
                            'high': float(item.get('high', 0)),
                            'low': float(item.get('low', 0)),
                            'close': float(item.get('close') or item.get('lastTradedPrice', 0)),
                            'volume': int(item.get('volume') or item.get('totalTradeQuantity', 0))
                        })
                elif isinstance(item, (list, tuple)):
                    # Array format - could be [date, open, high, low, close, volume] or [date, close]
                    if len(item) >= 6:
                        prices.append({
                            'date': str(item[0]),
                            'open': float(item[1]),
                            'high': float(item[2]),
                            'low': float(item[3]),
                            'close': float(item[4]),
                            'volume': int(item[5])
                        })
                    elif len(item) >= 2:
                        prices.append({
                            'date': str(item[0]),
                            'open': 0,
                            'high': 0,
                            'low': 0,
                            'close': float(item[1]),
                            'volume': 0
                        })
            except Exception as e:
                logger.debug(f"Error parsing item for {symbol}: {e}")
                continue
        
        if not prices:
            logger.warning(f"No valid price data parsed for {symbol}")
            return []
        
        # Sort by date and take last N days
        prices.sort(key=lambda x: x['date'])
        return prices[-days:]
    except Exception as e:
        logger.error(f"Error fetching historical data for {symbol}: {e}")
        import traceback
        traceback.print_exc()
        return []


def calculate_returns(prices: List[Dict]) -> Dict[str, float]:
    """Calculate various return periods from price series."""
    if len(prices) < 2:
        return {"1d": 0, "1m": 0, "3m": 0, "6m": 0}
    
    closes = [p['close'] for p in prices]
    current = closes[-1]
    
    def pct_change(period: int) -> float:
        if len(closes) <= period:
            return 0
        return ((current - closes[-period-1]) / closes[-period-1]) * 100
    
    return {
        "1d": pct_change(1),
        "1m": pct_change(21),
        "3m": pct_change(63),
        "6m": pct_change(126)
    }


def linear_regression_forecast(prices: List[Dict], horizon: int = 20) -> Dict:
    """OLS trend forecast similar to predict.ts"""
    closes = [p['close'] for p in prices]
    n = len(closes)
    
    if n < 10:
        return {"expected_return": 0, "expected_price": closes[-1] if closes else 0}
    
    # Use last 60 days for regression
    window = closes[-60:]
    n_win = len(window)
    xs = list(range(n_win))
    
    x_mean = sum(xs) / n_win
    y_mean = sum(window) / n_win
    
    num = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, window))
    den = sum((x - x_mean) ** 2 for x in xs)
    
    slope = num / den if den != 0 else 0
    intercept = y_mean - slope * x_mean
    
    # Trend price
    trend_price = closes[-1] + slope * horizon
    
    # 90-day mean for mean reversion
    mean_90 = sum(closes[-90:]) / min(90, len(closes))
    
    # Blend: 55% trend, 45% mean reversion
    blended = trend_price * 0.55 + mean_90 * 0.45
    
    expected_price = max(blended, closes[-1] * 0.5)
    expected_return = ((expected_price - closes[-1]) / closes[-1]) * 100
    
    # Volatility bands
    returns = [(window[i] / window[i-1] - 1) for i in range(1, len(window))]
    vol = np.std(returns, ddof=1)
    band = closes[-1] * vol * np.sqrt(20) * 1.65
    
    return {
        "expected_return": round(expected_return, 2),
        "expected_price": round(expected_price, 2),
        "low": round(max(expected_price - band, closes[-1] * 0.7), 2),
        "high": round(expected_price + band, 2)
    }


def compute_foundation_score(fundamentals: Dict, sector: str) -> tuple:
    """Compute foundation score from fundamentals."""
    # Profitability (32%)
    roe = fundamentals.get('roe', 0)
    roa = fundamentals.get('roa', 0)
    is_bank = sector == "Commercial Bank"
    
    roe_score = min(max((roe - 6) / (18 - 6) * 100, 0), 100)
    roa_target = 1.8 if is_bank else 10
    roa_poor = 0.6 if is_bank else 2
    roa_score = min(max((roa - roa_poor) / (roa_target - roa_poor) * 100, 0), 100)
    profitability = roe_score * 0.7 + roa_score * 0.3
    
    # Growth (18%)
    pg = fundamentals.get('profitGrowth3y', 0)
    rg = fundamentals.get('revenueGrowth3y', 0)
    growth = min(max((pg + 5) / 20 * 100, 0), 100) * 0.65 + \
             min(max((rg + 4) / 16 * 100, 0), 100) * 0.35
    
    # Balance Sheet (22%)
    if is_bank:
        npl = fundamentals.get('npl', 5)
        car = fundamentals.get('car', 10)
        npl_score = min(max((4.5 - npl) / (4.5 - 0.8) * 100, 0), 100)
        car_score = min(max((car - 11) / (16 - 11) * 100, 0), 100)
        dte_score = 80
        balance_sheet = npl_score * 0.5 + car_score * 0.35 + dte_score * 0.15
    else:
        dte = fundamentals.get('debtToEquity', 1)
        balance_sheet = min(max((1.4 - dte) / (1.4 - 0.2) * 100, 0), 100)
    
    # Payout (13%)
    dy = fundamentals.get('dividendYield', 0)
    payout = fundamentals.get('payout', 0)
    if dy <= 0:
        payout_score = 35
    else:
        dy_score = min(max(dy / 5 * 100, 0), 100)
        payout_capped = min(payout, 80)
        payout_score = min(max((payout_capped - 15) / (55 - 15) * 100, 0), 100)
        payout_score = dy_score * 0.7 + payout_score * 0.3
    
    # Governance (15%) - default average
    governance = 62
    
    foundation = (profitability * 0.32 + growth * 0.18 + 
                  balance_sheet * 0.22 + payout_score * 0.13 + 
                  governance * 0.15)
    
    factors = {
        "profitability": round(profitability, 1),
        "growth": round(growth, 1),
        "balanceSheet": round(balance_sheet, 1),
        "payout": round(payout_score, 1),
        "governance": governance
    }
    
    return round(foundation, 1), factors


def compute_valuation_score(fundamentals: Dict, sector_pe: float, sector_pb: float) -> float:
    """Compute valuation score vs sector medians."""
    pe = fundamentals.get('pe', sector_pe)
    pb = fundamentals.get('pb', sector_pb)
    
    # Score: 100 = cheap (0.7x median), 0 = expensive (1.6x median)
    pe_score = min(max((sector_pe * 1.6 - pe) / (sector_pe * 1.6 - sector_pe * 0.7) * 100, 0), 100)
    pb_score = min(max((sector_pb * 1.8 - pb) / (sector_pb * 1.8 - sector_pb * 0.75) * 100, 0), 100)
    
    return round(pe_score * 0.55 + pb_score * 0.45, 1)


def compute_momentum_score(returns: Dict) -> float:
    """Compute momentum score from returns."""
    s = (returns["1m"] / 18 * 0.45 + 
         returns["3m"] / 30 * 0.35 + 
         returns["6m"] / 42 * 0.2) * 100
    return round(min(max(s, 0), 100), 1)


def decide_action(foundation: float, valuation: float, momentum: float) -> tuple:
    """Determine action based on scores."""
    if foundation < 42:
        return "Avoid", "Business quality is too weak to underwrite."
    if foundation >= 70 and valuation >= 62:
        return "Accumulate", "Solid franchise at a valuation not stretched versus sector."
    if foundation >= 62 and valuation < 40:
        return "Wait", "Good company but multiple prices in a lot of the story."
    if foundation >= 55 and valuation >= 50:
        return "Hold", "Adequate business at fair price."
    if momentum >= 72 and foundation < 55:
        return "Avoid", "Tape strong but books weak. Chasing momentum without earnings."
    return "Wait", "Mixed signals: neither cheap enough nor high-quality enough."


def compute_forecast(prices: List[Dict], foundation: float, valuation: float) -> Dict:
    """Compute full forecast with probabilities."""
    forecast = linear_regression_forecast(prices)
    
    # Up probability calculation
    expected_return = forecast["expected_return"]
    r2 = 0.3  # simplified
    
    z = (expected_return / 4) * 0.5 + ((foundation - 50) / 20) * 0.25 + \
        ((valuation - 50) / 20) * 0.15 + (r2 - 0.2) * 0.4
    up_prob = 1 / (1 + np.exp(-z)) * 100
    
    # Confidence
    confidence = min(max(r2 * 55 + (foundation / 100) * 25 + 10, 22), 78)
    
    return {
        "expected_return": forecast["expected_return"],
        "expected_price": forecast["expected_price"],
        "low": forecast["low"],
        "high": forecast["high"],
        "up_probability": round(up_prob, 1),
        "confidence": round(confidence, 1),
        "method": "OLS trend on 60 sessions, 45% mean-reversion to 90-day average"
    }


def run_full_analysis():
    """Main analysis pipeline."""
    logger.info("=" * 50)
    logger.info(f"Starting EOD Analysis - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 50)
    
    conn = init_db()
    cursor = conn.cursor()
    
    # Compute sector medians
    sector_pes = {}
    sector_pbs = {}
    for symbol, fund in STATIC_FUNDAMENTALS.items():
        sector = fund['sector']
        if sector not in sector_pes:
            sector_pes[sector] = []
            sector_pbs[sector] = []
        sector_pes[sector].append(fund['pe'])
        sector_pbs[sector].append(fund['pb'])
    
    sector_medians = {}
    for sector in sector_pes:
        sector_medians[sector] = {
            'pe': np.median(sector_pes[sector]),
            'pb': np.median(sector_pbs[sector])
        }
    
    logger.info(f"Sector medians computed: {sector_medians}")
    
    # Process each symbol
    total = len(FULL_ANALYSIS_SYMBOLS)
    success = 0
    
    for idx, symbol in enumerate(FULL_ANALYSIS_SYMBOLS, 1):
        logger.info(f"[{idx}/{total}] Analyzing {symbol}...")
        
        # Fetch historical prices
        prices = fetch_historical_prices(symbol, LOOKBACK_DAYS)
        
        if len(prices) < 30:
            logger.warning(f"Insufficient data for {symbol} ({len(prices)} days), skipping")
            continue
        
        # Get fundamentals
        fundamentals = STATIC_FUNDAMENTALS[symbol]
        sector = fundamentals['sector']
        
        # Compute returns
        returns = calculate_returns(prices)
        
        # Compute scores
        foundation, factors = compute_foundation_score(fundamentals, sector)
        sector_median = sector_medians.get(sector, {'pe': 18, 'pb': 2.2})
        valuation = compute_valuation_score(fundamentals, sector_median['pe'], sector_median['pb'])
        momentum = compute_momentum_score(returns)
        
        # Action decision
        action, action_why = decide_action(foundation, valuation, momentum)
        
        # Forecast
        forecast = compute_forecast(prices, foundation, valuation)
        
        # Store analysis
        cursor.execute("""
            INSERT OR REPLACE INTO analysis_results 
            (symbol, analysis_date, foundation, valuation, momentum, action, action_why,
             forecast_return, forecast_price, up_probability, confidence, factors_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            symbol,
            ANALYSIS_DATE.strftime('%Y-%m-%d'),
            foundation,
            valuation,
            momentum,
            action,
            action_why,
            forecast['expected_return'],
            forecast['expected_price'],
            forecast['up_probability'],
            forecast['confidence'],
            json.dumps(factors)
        ))
        
        # Store EOD prices
        for p in prices:
            cursor.execute("""
                INSERT OR REPLACE INTO eod_prices 
                (symbol, date, open, high, low, close, volume)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (symbol, p['date'], p['open'], p['high'], p['low'], p['close'], p['volume']))
        
        conn.commit()
        success += 1
        logger.info(f"  ✓ {symbol}: Foundation={foundation}, Valuation={valuation}, Momentum={momentum}, Action={action}")
    
    # Update metadata
    cursor.execute("""
        INSERT OR REPLACE INTO analysis_metadata (key, value) VALUES (?, ?)
    """, ("last_run", datetime.now().isoformat()))
    cursor.execute("""
        INSERT OR REPLACE INTO analysis_metadata (key, value) VALUES (?, ?)
    """, ("symbols_analyzed", str(success)))
    conn.commit()
    
    logger.info("=" * 50)
    logger.info(f"Analysis complete: {success}/{total} symbols processed")
    logger.info("=" * 50)
    
    conn.close()


if __name__ == "__main__":
    run_full_analysis()