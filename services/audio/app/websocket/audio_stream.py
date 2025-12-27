"""WebSocket handler for audio streaming."""
import json
import uuid
from datetime import datetime
from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.audio_processor import AudioProcessor
from ..config import settings

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))))

from shared.redis_client import redis_client, Channels
from shared.schemas.events import AudioChunkEvent


class AudioStreamHandler:
    """Handles WebSocket audio streaming."""
    
    def __init__(
        self,
        websocket: WebSocket,
        session_id: uuid.UUID,
        db: AsyncSession,
    ):
        self.websocket = websocket
        self.session_id = session_id
        self.db = db
        self.processor = AudioProcessor(db)
        self.recording_id: Optional[uuid.UUID] = None
        self.chunk_index = 0
        self.total_duration = 0.0
        self.is_recording = False
    
    async def handle(self) -> None:
        """Main handler for the WebSocket connection."""
        try:
            await self.websocket.accept()
            
            # Create a new recording
            recording = await self.processor.create_recording(self.session_id)
            self.recording_id = recording.id
            self.is_recording = True
            
            # Send start confirmation
            await self.websocket.send_json({
                "type": "start",
                "data": {
                    "recording_id": str(self.recording_id),
                    "session_id": str(self.session_id),
                },
            })
            
            # Receive audio chunks
            while self.is_recording:
                try:
                    # Receive binary audio data
                    data = await self.websocket.receive()
                    
                    if "bytes" in data:
                        await self._process_chunk(data["bytes"])
                    elif "text" in data:
                        message = json.loads(data["text"])
                        if message.get("type") == "end":
                            break
                        elif message.get("type") == "ping":
                            await self.websocket.send_json({"type": "pong"})
                    
                except WebSocketDisconnect:
                    break
            
            # Finalize recording
            await self._finalize()
            
        except Exception as e:
            if self.recording_id:
                await self.processor.mark_failed(self.recording_id)
            # Only try to send error if connection is still open
            try:
                await self.websocket.send_json({
                    "type": "error",
                    "error": str(e),
                })
            except Exception:
                pass  # Connection already closed
    
    async def _process_chunk(self, audio_data: bytes) -> None:
        """Process an audio chunk."""
        if not self.recording_id:
            return
        
        print(f"AudioStreamHandler: Processing chunk {self.chunk_index}, size={len(audio_data)} bytes")
        
        # Estimate duration based on typical WebM audio
        # Actual duration calculation would need audio parsing
        chunk_duration = settings.chunk_duration_seconds
        
        # Save chunk
        chunk = await self.processor.save_chunk(
            recording_id=self.recording_id,
            session_id=self.session_id,
            chunk_index=self.chunk_index,
            audio_data=audio_data,
            duration_seconds=chunk_duration,
        )
        
        self.chunk_index += 1
        self.total_duration += chunk_duration
        
        # Publish event for transcription service
        event = AudioChunkEvent(
            session_id=str(self.session_id),
            recording_id=str(self.recording_id),
            chunk_index=chunk.chunk_index,
            file_path=chunk.file_path,
            duration_seconds=chunk.duration_seconds,
        )
        
        channel = Channels.audio_chunk(str(self.session_id))
        print(f"AudioStreamHandler: Publishing to channel {channel}")
        await redis_client.publish(channel, event.model_dump(mode="json"))
        print(f"AudioStreamHandler: Published chunk {chunk.chunk_index}")
        
        # Send confirmation
        await self.websocket.send_json({
            "type": "chunk_received",
            "data": {
                "chunk_index": self.chunk_index,
                "total_duration": self.total_duration,
            },
        })
    
    async def _finalize(self) -> None:
        """Finalize the recording."""
        if self.recording_id:
            await self.processor.finalize_recording(
                self.recording_id,
                self.total_duration,
            )
            
            await self.websocket.send_json({
                "type": "end",
                "data": {
                    "recording_id": str(self.recording_id),
                    "total_chunks": self.chunk_index,
                    "total_duration": self.total_duration,
                },
            })

