#!/bin/bash
# Complete setup for EOD Analysis System

set -e

PROJECT_DIR="/home/dell/Documents/Trade_repo"
cd "$PROJECT_DIR"

echo "=== NEPSE EOD Analysis Setup ==="

# 1. Create directories
echo "Creating directories..."
mkdir -p data logs scripts

# 2. Install Python dependencies
echo "Installing Python dependencies..."
source venv/bin/activate
pip install --quiet flask==3.1.0 pandas numpy
pip install --quiet git+https://github.com/basic-bgnr/NepseUnofficialApi

# 3. Install Node dependencies
echo "Installing Node dependencies..."
npm install sqlite3 sqlite 2>/dev/null

# 3. Initialize database
echo "Initializing database..."
python3 -c "
import sqlite3, os
os.makedirs('data', exist_ok=True)
conn = sqlite3.connect('data/eod_analysis.db')
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS eod_prices (
    symbol TEXT NOT NULL, date TEXT NOT NULL, open REAL, high REAL, low REAL, close REAL, volume INTEGER,
    PRIMARY KEY (symbol, date)
)''')
c.execute('''CREATE TABLE IF NOT EXISTS analysis_results (
    symbol TEXT NOT NULL, analysis_date TEXT NOT NULL, foundation REAL, valuation REAL, momentum REAL,
    action TEXT, action_why TEXT, forecast_return REAL, forecast_price REAL,
    up_probability REAL, confidence REAL, factors_json TEXT,
    PRIMARY KEY (symbol, analysis_date)
)''')
c.execute('''CREATE TABLE IF NOT EXISTS analysis_metadata (
    key TEXT PRIMARY KEY, value TEXT
)''')
conn.commit()
print('Database initialized')
"

# 5. Setup cron job
echo "Setting up cron job (8 PM NPT = 14:15 UTC)..."
CRON_JOB="15 14 * * * cd /home/dell/Documents/Trade_repo && source venv/bin/activate && python scripts/eod-analysis.py >> logs/eod-cron.log 2>&1"
(crontab -l 2>/dev/null | grep -v "eod-analysis.py"; echo "15 14 * * * cd /home/dell/Documents/Trade_repo && source venv/bin/activate && python scripts/eod-analysis.py >> logs/eod-cron.log 2>&1") | crontab -

echo "Cron job installed:"
crontab -l | grep eod-analysis

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To run analysis manually:"
echo "  cd $PROJECT_DIR && source venv/bin/activate && python scripts/eod-analysis.py"
echo ""
echo "To start Next.js:"
echo "  npm run dev"
echo ""
echo "API endpoints:"
echo "  GET /api/analysis                    - All analyses for today"
echo "  GET /api/analysis?symbol=NABIL       - Single symbol with price history"
echo ""
echo "Cron job runs daily at 14:15 UTC (8 PM NPT)"
echo "Logs: tail -f logs/eod-analysis.log"
echo "Cron logs: tail -f logs/eod-cron.log"