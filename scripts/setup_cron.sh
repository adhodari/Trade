#!/bin/bash
# Setup cron job for daily EOD analysis at 8 PM NPT (14:15 UTC)

# Add to crontab
CRON_JOB="15 14 * * * cd /home/dell/Documents/Trade_repo && source venv/bin/activate && python scripts/eod-analysis.py >> /home/dell/Documents/Trade_repo/logs/eod-analysis-cron.log 2>&1"

# Check if already exists
if crontab -l 2>/dev/null | grep -q "eod-analysis.py"; then
    echo "Cron job already exists"
    crontab -l | grep eod-analysis.py
else
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "Cron job added: Daily at 14:15 UTC (8 PM NPT)"
fi

echo "Current crontab:"
crontab -l