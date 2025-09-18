#!/usr/bin/env python3
"""
Script to update urgency levels for all assignments.
Can be run as a cron job or manually.
"""

import os
import sys
from datetime import date
import psycopg
from psycopg.rows import dict_row

def _env_nonempty(name: str) -> str | None:
    v = os.getenv(name)
    return v if v and v.strip() else None

DSN = _env_nonempty("DATABASE_DSN") or _env_nonempty("PSQL_URL")

def get_conn():
    if not DSN:
        raise RuntimeError("DATABASE_DSN is not set or empty")
    return psycopg.connect(DSN, row_factory=dict_row)

def calculate_urgency_level(due_date: date | None) -> str:
    """Calculate urgency level based on due date"""
    if not due_date:
        return "none"
    
    today = date.today()
    days_diff = (due_date - today).days
    
    if days_diff < 0:
        return "overdue"
    elif days_diff <= 7:
        return "urgent"
    elif days_diff <= 30:
        return "soon"
    else:
        return "normal"

def update_urgency_levels():
    """Update urgency levels for all assignments"""
    
    counts = {"overdue": 0, "urgent": 0, "soon": 0, "normal": 0, "none": 0}
    updated_count = 0
    
    try:
        with get_conn() as conn, conn.cursor() as cur:
            # Get all assignments
            cur.execute("""
                SELECT assignment_id, due_date, urgency_level 
                FROM assignments 
                WHERE status != 'completed'
            """)
            assignments = cur.fetchall()
            
            print(f"Processing {len(assignments)} assignments...")
            
            for assignment in assignments:
                assignment_id = assignment["assignment_id"]
                due_date = assignment["due_date"]
                current_urgency = assignment["urgency_level"]
                
                new_urgency = calculate_urgency_level(due_date)
                counts[new_urgency] += 1
                
                # Update only if urgency level changed
                if current_urgency != new_urgency:
                    cur.execute("""
                        UPDATE assignments 
                        SET urgency_level = %s, updated_at = now()
                        WHERE assignment_id = %s
                    """, (new_urgency, assignment_id))
                    updated_count += 1
                    print(f"Updated assignment {assignment_id}: {current_urgency} -> {new_urgency}")
            
            conn.commit()
            
        print(f"\nUpdate completed!")
        print(f"Updated: {updated_count} assignments")
        print(f"Overdue: {counts['overdue']}")
        print(f"Urgent: {counts['urgent']}")
        print(f"Soon: {counts['soon']}")
        print(f"Normal: {counts['normal']}")
        print(f"None: {counts['none']}")
        
        return True
        
    except Exception as e:
        print(f"Error updating urgency levels: {e}")
        return False

if __name__ == "__main__":
    success = update_urgency_levels()
    sys.exit(0 if success else 1)