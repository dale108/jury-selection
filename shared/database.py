"""Database connection utilities for all microservices."""
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


def get_database_url() -> str:
    """Construct database URL from environment variables."""
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    user = os.getenv("POSTGRES_USER", "voirdire")
    password = os.getenv("POSTGRES_PASSWORD", "voirdire_secret")
    db = os.getenv("POSTGRES_DB", "voirdire")
    return f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{db}"


def create_engine():
    """Create async SQLAlchemy engine."""
    return create_async_engine(
        get_database_url(),
        echo=os.getenv("SQL_ECHO", "false").lower() == "true",
        pool_pre_ping=True,
    )


def create_session_factory(engine) -> async_sessionmaker[AsyncSession]:
    """Create async session factory."""
    return async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


# Default engine and session factory
engine = create_engine()
AsyncSessionLocal = create_session_factory(engine)


async def get_db() -> AsyncSession:
    """Dependency for getting database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

