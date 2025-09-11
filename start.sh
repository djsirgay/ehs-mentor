#!/usr/bin/env bash
set -e
echo "[start] running migrations..."
alembic upgrade head
echo "[start] starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
