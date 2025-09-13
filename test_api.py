#!/usr/bin/env python3
"""
Простой скрипт для тестирования API после деплоя
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8001/api"

def test_health():
    resp = requests.get("http://127.0.0.1:8001/health")
    print(f"Health: {resp.status_code} {resp.json()}")

def test_recommend():
    resp = requests.post(f"{BASE_URL}/recommend", json={"user_id": "user001"})
    print(f"Recommend: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"  Found {data['count']} courses for user {data['user_id']}")

def test_assignments():
    # Create assignment
    resp = requests.post(f"{BASE_URL}/assignments/create", json={
        "user_id": "user001",
        "course_id": "OSHA-10-GEN"
    })
    print(f"Create assignment: {resp.status_code}")
    
    # List assignments
    resp = requests.post(f"{BASE_URL}/assignments/list", json={"user_id": "user001"})
    print(f"List assignments: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"  User {data['user_id']} has {data['count']} assignments")

def test_chat():
    resp = requests.post(f"{BASE_URL}/chat", json={
        "prompt": "What is OSHA 10-hour training?"
    })
    print(f"Chat: {resp.status_code}")
    if resp.status_code == 200:
        reply = resp.json()["reply"]
        print(f"  AI reply: {reply[:100]}...")

if __name__ == "__main__":
    print("Testing EHS Mentor API...")
    test_health()
    test_recommend()
    test_assignments()
    test_chat()
    print("Done!")