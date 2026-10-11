from collections.abc import AsyncIterator
from pathlib import Path
from typing import Annotated

from alembic import command
from alembic.config import Config
from fastapi import Depends
from sqlalchemy import create_engine, make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker

from core.config import POSTGRES_URL

_ALEMBIC_INI = Path(__file__).resolve().parents[2] / "alembic.ini"

# Sync engine: Celery worker and Alembic, which both run synchronous code.
engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(engine, expire_on_commit=False)

# Async engine: FastAPI endpoints.
async_engine = create_async_engine(
    make_url(POSTGRES_URL).set(drivername="postgresql+asyncpg"), pool_pre_ping=True
)
AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]


def run_migrations() -> None:
    config = Config(str(_ALEMBIC_INI))
    config.attributes["configure_logger"] = False
    command.upgrade(config, "head")
