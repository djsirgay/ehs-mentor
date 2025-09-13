#!/bin/bash
# Запуск без Docker для презентации

echo "🚀 Starting EHS Mentor (no Docker)..."

# Проверяем .env
if [ ! -f .env ]; then
    echo "❌ Создай .env файл"
    exit 1
fi

# Запускаем API напрямую
echo "🌐 Starting API..."
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

echo "✅ API running at http://localhost:8001"