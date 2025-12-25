#!/usr/bin/env python3
"""
Test script for verifying voir-dire API endpoints.
Run with: python scripts/test_api.py

Requires the services to be running (docker compose up).
"""
import httpx
import asyncio
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api"


async def test_session_crud():
    """Test Session service CRUD operations."""
    print("\n=== Testing Session Service ===")
    
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # Create session
        session_data = {
            "case_number": "2024-TEST-001",
            "case_name": "State v. Test Defendant",
            "court": "King County Superior Court",
            "metadata": {"judge": "Test Judge", "courtroom": "E-501"}
        }
        response = await client.post("/sessions/", json=session_data)
        assert response.status_code == 201, f"Failed to create session: {response.text}"
        session = response.json()
        session_id = session["id"]
        print(f"✓ Created session: {session_id}")
        
        # Get session
        response = await client.get(f"/sessions/{session_id}")
        assert response.status_code == 200
        print(f"✓ Retrieved session: {response.json()['case_number']}")
        
        # Update session status
        response = await client.patch(
            f"/sessions/{session_id}/status",
            json={"status": "active"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "active"
        print(f"✓ Updated session status to: active")
        
        # List sessions
        response = await client.get("/sessions/")
        assert response.status_code == 200
        sessions = response.json()
        print(f"✓ Listed sessions: {sessions['total']} total")
        
        return session_id


async def test_juror_crud(session_id: str):
    """Test Juror service CRUD operations."""
    print("\n=== Testing Juror Service ===")
    
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # Create jurors
        jurors_data = [
            {
                "session_id": session_id,
                "seat_number": 1,
                "first_name": "Jane",
                "last_name": "Smith",
                "occupation": "Software Engineer",
                "neighborhood": "Capitol Hill",
                "demographics": {"age_range": "30-40"},
                "notes": "Works from home"
            },
            {
                "session_id": session_id,
                "seat_number": 2,
                "first_name": "John",
                "last_name": "Doe",
                "occupation": "Teacher",
                "neighborhood": "Ballard",
                "demographics": {"age_range": "40-50"},
            },
        ]
        
        juror_ids = []
        for juror_data in jurors_data:
            response = await client.post("/jurors/", json=juror_data)
            assert response.status_code == 201, f"Failed: {response.text}"
            juror_ids.append(response.json()["id"])
            print(f"✓ Created juror: {juror_data['first_name']} {juror_data['last_name']}")
        
        # Get juror
        response = await client.get(f"/jurors/{juror_ids[0]}")
        assert response.status_code == 200
        print(f"✓ Retrieved juror with transcript data")
        
        # Create speaker mapping
        response = await client.post(
            f"/jurors/{juror_ids[0]}/speaker-mapping",
            json={"speaker_label": "SPEAKER_00"}
        )
        assert response.status_code == 201
        print(f"✓ Created speaker mapping: SPEAKER_00 -> {juror_ids[0]}")
        
        # List jurors for session
        response = await client.get(f"/jurors/?session_id={session_id}")
        assert response.status_code == 200
        print(f"✓ Listed jurors for session: {response.json()['total']} total")
        
        return juror_ids


async def test_audio_endpoints(session_id: str):
    """Test Audio service endpoints (non-WebSocket)."""
    print("\n=== Testing Audio Service ===")
    
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # List recordings (should be empty)
        response = await client.get(f"/audio/recordings/{session_id}")
        assert response.status_code == 200
        recordings = response.json()
        print(f"✓ Listed recordings: {recordings['total']} total")
        
        # Note: WebSocket streaming would need to be tested separately
        print("  (WebSocket streaming requires a separate test)")


async def test_transcript_endpoints(session_id: str):
    """Test Transcription service endpoints."""
    print("\n=== Testing Transcription Service ===")
    
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # List transcripts (should be empty)
        response = await client.get(f"/transcripts/?session_id={session_id}")
        assert response.status_code == 200
        transcripts = response.json()
        print(f"✓ Listed transcripts: {transcripts['total']} total")
        
        # Get by speaker
        response = await client.get(f"/transcripts/session/{session_id}/by-speaker")
        assert response.status_code == 200
        print(f"✓ Retrieved transcripts grouped by speaker")


async def test_health_checks():
    """Test health check endpoints for all services."""
    print("\n=== Testing Health Checks ===")
    
    services = [
        ("Gateway", "http://localhost:8000/health"),
        ("Session", "http://localhost:8004/health"),
        ("Juror", "http://localhost:8003/health"),
        ("Audio", "http://localhost:8001/health"),
        ("Transcription", "http://localhost:8002/health"),
    ]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        for name, url in services:
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    print(f"✓ {name}: healthy")
                else:
                    print(f"✗ {name}: unhealthy ({response.status_code})")
            except Exception as e:
                print(f"✗ {name}: unreachable ({e})")


async def main():
    """Run all tests."""
    print("=" * 50)
    print("Voir-Dire API Test Suite")
    print("=" * 50)
    
    try:
        # Test health checks first
        await test_health_checks()
        
        # Test CRUD operations
        session_id = await test_session_crud()
        await test_juror_crud(session_id)
        await test_audio_endpoints(session_id)
        await test_transcript_endpoints(session_id)
        
        print("\n" + "=" * 50)
        print("All tests passed!")
        print("=" * 50)
        
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
    except httpx.ConnectError:
        print("\n✗ Could not connect to API. Make sure services are running:")
        print("  docker compose up")


if __name__ == "__main__":
    asyncio.run(main())

