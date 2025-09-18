#!/bin/bash
# Setup cron job to update urgency levels daily at 6 AM

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/update_urgency.py"

# Make script executable
chmod +x "$PYTHON_SCRIPT"

# Add cron job (runs daily at 6:00 AM)
CRON_JOB="0 6 * * * cd $SCRIPT_DIR && python3 $PYTHON_SCRIPT >> /tmp/urgency_update.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "update_urgency.py"; then
    echo "Cron job already exists"
else
    # Add the cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "Cron job added: Daily urgency level update at 6:00 AM"
fi

echo "Current crontab:"
crontab -l