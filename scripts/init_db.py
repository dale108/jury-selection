#!/usr/bin/env python3
"""Initialize the database with all tables."""
import asyncio
import sys
import os

# Add parent directory to path for shared imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.database import engine, Base


async def init_database():
    """Create all database tables."""
    print("Initializing database...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database initialized successfully!")


if __name__ == "__main__":
    asyncio.run(init_database())

