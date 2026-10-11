from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from core.config import POSTGRES_URL
from db.postgres.models import Base

config = context.config

# Skipped when migrations run from the app, so Alembic does not reset uvicorn's loggers.
if config.config_file_name is not None and config.attributes.get("configure_logger", True):
    fileConfig(config.config_file_name)

target_metadata = Base.metadata
# Single source of the database URL; "%" is escaped because the ini parser interpolates it.
config.set_main_option("sqlalchemy.url", POSTGRES_URL.replace("%", "%%"))


def run_migrations_offline() -> None:
    """Emit migration SQL as text (`alembic upgrade head --sql`) without a database."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Apply migrations to the database."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
