#!/usr/bin/env python3
"""Seed the database with sample data for development."""
import asyncio
import sys
import os
from datetime import datetime
import uuid

# Add parent directory to path for shared imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.database import AsyncSessionLocal


async def seed_database():
    """Seed database with sample data."""
    print("Seeding database with sample data...")
    
    async with AsyncSessionLocal() as session:
        # Import models here to avoid circular imports
        from services.session.app.models import Session
        from services.juror.app.models import Juror
        
        # Create a sample session
        sample_session = Session(
            id=uuid.uuid4(),
            case_number="2024-CR-001234",
            case_name="State v. Sample Defendant",
            court="King County Superior Court",
            status="active",
            started_at=datetime.utcnow(),
            metadata={"judge": "Hon. Sample Judge", "courtroom": "E-501"}
        )
        session.add(sample_session)
        
        # Create sample jurors
        sample_jurors = [
            Juror(
                id=uuid.uuid4(),
                session_id=sample_session.id,
                seat_number=1,
                first_name="Jane",
                last_name="Smith",
                occupation="Software Engineer",
                neighborhood="Capitol Hill",
                demographics={"age_range": "30-40"},
                notes="Works from home, flexible schedule",
            ),
            Juror(
                id=uuid.uuid4(),
                session_id=sample_session.id,
                seat_number=2,
                first_name="John",
                last_name="Doe",
                occupation="Teacher",
                neighborhood="Ballard",
                demographics={"age_range": "40-50"},
                notes="Middle school science teacher",
            ),
        ]
        
        for juror in sample_jurors:
            session.add(juror)
        
        await session.commit()
        print(f"Created session: {sample_session.case_number}")
        print(f"Created {len(sample_jurors)} jurors")
    
    print("Seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed_database())

