#!/bin/bash
# Быстрый деплой EHS Mentor для презентации

echo "🚀 Deploying EHS Mentor..."

# Проверяем .env
if [ ! -f .env ]; then
    echo "❌ Создай .env файл (скопируй из .env.example)"
    exit 1
fi

# Запускаем БД
echo "📊 Starting database..."
docker compose up -d db

# Ждем БД
echo "⏳ Waiting for database..."
sleep 5

# Миграции
echo "🔄 Running migrations..."
poetry run alembic upgrade head

# Загружаем данные (если есть)
if [ -f "data/courses.csv" ]; then
    echo "📋 Loading sample data..."
    # Здесь можно добавить загрузку CSV в БД
fi

# Запускаем API
echo "🌐 Starting API..."
docker compose up -d --build api

echo "✅ EHS Mentor deployed!"
echo "🔗 API: http://localhost:8001"
echo "🔗 Health: http://localhost:8001/health"
echo "🔗 Adminer: http://localhost:8080"