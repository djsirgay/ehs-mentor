import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

config = context.config

# Загружаем .env
from dotenv import load_dotenv
load_dotenv()

# Берём URL из переменной окружения
db_url = os.getenv("DATABASE_DSN")
if not db_url:
    raise ValueError("DATABASE_DSN environment variable is required")

# Нормализуем форматы
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Добавляем +psycopg для SQLAlchemy
if db_url.startswith("postgresql://"):
    sa_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
else:
    sa_url = db_url

config.set_main_option("sqlalchemy.url", sa_url)

# Логи alembic.ini (если есть)
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Мы не используем autogenerate сейчас
target_metadata = None

def run_migrations_offline():
    """Запуск миграций без подключения (генерация SQL)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Обычные миграции с подключением к БД."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
