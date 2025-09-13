#!/usr/bin/env python3
"""Быстрая загрузка демо-данных в БД"""
import csv
import os
from app.db import get_conn

def load_courses():
    if not os.path.exists("data/courses.csv"):
        print("❌ data/courses.csv not found")
        return
    
    with get_conn() as conn, conn.cursor() as cur:
        with open("data/courses.csv", "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cur.execute("""
                    INSERT INTO courses (course_id, title, description, category, duration_minutes, url, tags, prerequisites, provider)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (course_id) DO NOTHING
                """, (
                    row.get("course_id"),
                    row.get("title"),
                    row.get("description"),
                    row.get("category"),
                    int(row.get("duration_minutes", 0)) if row.get("duration_minutes") else None,
                    row.get("url"),
                    row.get("tags"),
                    row.get("prerequisites"),
                    row.get("provider")
                ))
        conn.commit()
    print("✅ Courses loaded")

def load_users():
    if not os.path.exists("data/users.csv"):
        print("❌ data/users.csv not found")
        return
    
    with get_conn() as conn, conn.cursor() as cur:
        with open("data/users.csv", "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cur.execute("""
                    INSERT INTO users (user_id, name, email, role, department)
                    VALUES (%s,%s,%s,%s,%s)
                    ON CONFLICT (user_id) DO NOTHING
                """, (
                    row.get("user_id"),
                    row.get("name"),
                    row.get("email"),
                    row.get("role"),
                    row.get("department")
                ))
        conn.commit()
    print("✅ Users loaded")

if __name__ == "__main__":
    print("📋 Loading demo data...")
    load_courses()
    load_users()
    print("🎉 Demo data ready!")