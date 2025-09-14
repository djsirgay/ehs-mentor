FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

# poetry
RUN pip install --no-cache-dir "poetry==2.1.4"

# deps
COPY pyproject.toml poetry.lock /app/
RUN poetry config virtualenvs.create false \
 && poetry install --no-interaction --no-ansi

# alembic (ini + migrations)
COPY alembic.ini /app/alembic.ini
COPY db_migrations /app/db_migrations

# app
COPY app /app/app
COPY data /app/data
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 8000
CMD ["/app/start.sh"]
