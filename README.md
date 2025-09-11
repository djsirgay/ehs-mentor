# EHS Mentor — Database-first API  
*(English ↓ | Русская версия ниже ↓)*

## Overview
Real, non-demo system for assigning EHS training:
- **Single source of truth:** PostgreSQL (via Docker)
- **Schema control:** Alembic migrations
- **API:** FastAPI (containerized)
- **AI:** Amazon Bedrock (Claude) for PDF requirement extraction
- **PDF parsing:** pypdf
- **Principle:** assign **ALL** matching courses (not a fixed number)

## Quick start (local)
```bash
docker compose up -d                    # Postgres + Adminer
poetry install
poetry run alembic upgrade head         # apply migrations
docker compose up -d --build api        # build & run API
curl http://127.0.0.1:8001/health
