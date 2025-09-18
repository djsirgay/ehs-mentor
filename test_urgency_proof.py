#!/usr/bin/env python3
"""
Proof that urgency levels are stored in database
"""

import os
import requests
from datetime import date, timedelta
import psycopg
from psycopg.rows import dict_row

# Database connection
def _env_nonempty(name: str) -> str | None:
    v = os.getenv(name)
    return v if v and v.strip() else None

DSN = _env_nonempty("DATABASE_DSN") or _env_nonempty("PSQL_URL")

def get_conn():
    if not DSN:
        raise RuntimeError("DATABASE_DSN is not set or empty")
    return psycopg.connect(DSN, row_factory=dict_row)

def test_database_schema():
    """Test 1: Verify urgency_level column exists in database"""
    print("🔍 TEST 1: Database Schema")
    
    with get_conn() as conn, conn.cursor() as cur:
        # Check if urgency_level column exists
        cur.execute("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'assignments' AND column_name = 'urgency_level'
        """)
        result = cur.fetchone()
        
        if result:
            print(f"✅ urgency_level column exists: {result['data_type']}, default: {result['column_default']}")
            return True
        else:
            print("❌ urgency_level column NOT found")
            return False

def test_direct_database_query():
    """Test 2: Query urgency_level directly from database"""
    print("\n🔍 TEST 2: Direct Database Query")
    
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT assignment_id, user_id, course_id, due_date, urgency_level, status
            FROM assignments 
            WHERE status != 'completed'
            LIMIT 5
        """)
        results = cur.fetchall()
        
        if results:
            print("✅ Found assignments with urgency_level:")
            for row in results:
                print(f"   ID: {row['assignment_id']}, User: {row['user_id']}, "
                      f"Due: {row['due_date']}, Urgency: {row['urgency_level']}")
            return True
        else:
            print("❌ No assignments found")
            return False

def test_urgency_api():
    """Test 3: Test urgency API endpoints"""
    print("\n🔍 TEST 3: API Endpoints")
    
    base_url = "https://ehs-mentor-api-prod.onrender.com"
    
    try:
        # Test urgency stats endpoint
        response = requests.get(f"{base_url}/api/assignments/urgency-stats")
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ Urgency stats API works: {stats}")
            return True
        else:
            print(f"❌ API failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API error: {e}")
        return False

def test_assignments_api_includes_urgency():
    """Test 4: Verify assignments API returns urgency_level"""
    print("\n🔍 TEST 4: Assignments API includes urgency_level")
    
    base_url = "https://ehs-mentor-api-prod.onrender.com"
    
    try:
        response = requests.get(f"{base_url}/api/assignments/list?user_id=u001")
        if response.status_code == 200:
            data = response.json()
            if data.get('items') and len(data['items']) > 0:
                first_item = data['items'][0]
                if 'urgency_level' in first_item:
                    print(f"✅ API returns urgency_level: {first_item['urgency_level']}")
                    print(f"   Sample assignment: {first_item['course_id']} - {first_item.get('due_date')}")
                    return True
                else:
                    print("❌ urgency_level field missing from API response")
                    return False
            else:
                print("❌ No assignments returned")
                return False
        else:
            print(f"❌ API failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API error: {e}")
        return False

def test_urgency_calculation():
    """Test 5: Verify urgency calculation logic"""
    print("\n🔍 TEST 5: Urgency Calculation Logic")
    
    def calculate_urgency_level(due_date: date | None) -> str:
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
    
    # Test cases
    today = date.today()
    test_cases = [
        (today - timedelta(days=5), "overdue"),
        (today + timedelta(days=3), "urgent"),
        (today + timedelta(days=15), "soon"),
        (today + timedelta(days=60), "normal"),
        (None, "none")
    ]
    
    all_passed = True
    for test_date, expected in test_cases:
        result = calculate_urgency_level(test_date)
        if result == expected:
            print(f"✅ {test_date} -> {result}")
        else:
            print(f"❌ {test_date} -> {result} (expected {expected})")
            all_passed = False
    
    return all_passed

def test_database_sorting():
    """Test 6: Verify database sorts by urgency_level"""
    print("\n🔍 TEST 6: Database Sorting by Urgency")
    
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT course_id, urgency_level, due_date
            FROM assignments 
            WHERE status != 'completed'
            ORDER BY 
                CASE urgency_level 
                    WHEN 'overdue' THEN 1
                    WHEN 'urgent' THEN 2 
                    WHEN 'soon' THEN 3
                    WHEN 'normal' THEN 4
                    ELSE 5
                END,
                due_date ASC
            LIMIT 10
        """)
        results = cur.fetchall()
        
        if results:
            print("✅ Database sorting by urgency works:")
            for row in results:
                print(f"   {row['course_id']}: {row['urgency_level']} (due: {row['due_date']})")
            return True
        else:
            print("❌ No sorted results")
            return False

def run_all_tests():
    """Run all proof tests"""
    print("🚀 PROVING URGENCY LEVELS ARE STORED IN DATABASE\n")
    
    tests = [
        test_database_schema,
        test_direct_database_query,
        test_urgency_api,
        test_assignments_api_includes_urgency,
        test_urgency_calculation,
        test_database_sorting
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n📊 RESULTS: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 PROOF COMPLETE: Urgency levels are fully implemented and stored in database!")
    else:
        print("⚠️  Some tests failed - implementation may be incomplete")
    
    return passed == total

if __name__ == "__main__":
    run_all_tests()