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
        # Accumulate all audio data for complete file
        self.all_audio_data: list[bytes] = []
    
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
                            print("AudioStreamHandler: Received end message", flush=True)
                            break
                        elif message.get("type") == "ping":
                            await self.websocket.send_json({"type": "pong"})
                    
                except WebSocketDisconnect:
                    print("AudioStreamHandler: WebSocket disconnected", flush=True)
                    break
                except RuntimeError as e:
                    if "disconnect" in str(e).lower():
                        print("AudioStreamHandler: Client disconnected", flush=True)
                        break
                    raise
            
        except Exception as e:
            import traceback
            print(f"AudioStreamHandler: Error during streaming: {e}", flush=True)
            traceback.print_exc()
            # Only try to send error if connection is still open
            try:
                await self.websocket.send_json({
                    "type": "error",
                    "error": str(e),
                })
            except Exception:
                pass  # Connection already closed
        finally:
            # Always finalize recording when handler exits
            print(f"AudioStreamHandler: Handler exiting, finalizing...", flush=True)
            try:
                await self._finalize()
            except Exception as e:
                import traceback
                print(f"AudioStreamHandler: Error during finalization: {e}", flush=True)
                traceback.print_exc()
                if self.recording_id:
                    await self.processor.mark_failed(self.recording_id)
    
    async def _process_chunk(self, audio_data: bytes) -> None:
        """Process an audio chunk."""
        if not self.recording_id:
            return
        
        print(f"AudioStreamHandler: Processing chunk {self.chunk_index}, size={len(audio_data)} bytes", flush=True)
        
        # Accumulate audio data for complete file
        self.all_audio_data.append(audio_data)
        
        # Estimate duration based on typical WebM audio
        chunk_duration = settings.chunk_duration_seconds
        
        # Save chunk to storage (for backup/debugging)
        chunk = await self.processor.save_chunk(
            recording_id=self.recording_id,
            session_id=self.session_id,
            chunk_index=self.chunk_index,
            audio_data=audio_data,
            duration_seconds=chunk_duration,
        )
        
        self.chunk_index += 1
        self.total_duration += chunk_duration
        
        # Note: We no longer publish chunk events - we'll transcribe the complete file
        
        # Send confirmation
        await self.websocket.send_json({
            "type": "chunk_received",
            "data": {
                "chunk_index": self.chunk_index,
                "total_duration": self.total_duration,
            },
        })
    
    def _merge_wav_chunks(self, chunks: list[bytes]) -> bytes:
        """Merge multiple WAV chunks into a single valid WAV file.
        
        Each chunk is a complete WAV file with header. We need to:
        1. Keep the header from the first chunk
        2. Extract PCM data (skip 44-byte header) from all chunks
        3. Combine all PCM data
        4. Update the header's size fields
        """
        if not chunks:
            return b''
        
        if len(chunks) == 1:
            return chunks[0]
        
        # Extract header from first chunk (first 44 bytes)
        header = chunks[0][:44]
        
        # Verify it's a valid WAV header
        if header[:4] != b'RIFF' or header[8:12] != b'WAVE':
            print(f"Warning: Invalid WAV header, using simple concatenation", flush=True)
            return b''.join(chunks)
        
        # Extract PCM data from all chunks (skip 44-byte header from each)
        pcm_data_parts = []
        for chunk in chunks:
            if len(chunk) > 44:
                pcm_data_parts.append(chunk[44:])
            elif len(chunk) == 44:
                # Empty data chunk, skip
                continue
        
        # Combine all PCM data
        combined_pcm = b''.join(pcm_data_parts)
        
        # Calculate new file size (header + data)
        new_file_size = 36 + len(combined_pcm)  # 36 = RIFF header size (8) + fmt chunk (28)
        new_data_size = len(combined_pcm)
        
        # Update header with new sizes
        # Bytes 4-7: File size - 8
        header = bytearray(header)
        header[4:8] = new_file_size.to_bytes(4, 'little')
        # Bytes 40-43: Data size
        header[40:44] = new_data_size.to_bytes(4, 'little')
        
        # Combine header + PCM data
        return bytes(header) + combined_pcm
    
    async def _finalize(self) -> None:
        """Finalize the recording and trigger transcription."""
        if self.recording_id and self.all_audio_data:
            # Merge WAV chunks properly (each chunk is a complete WAV file)
            complete_audio = self._merge_wav_chunks(self.all_audio_data)
            print(f"AudioStreamHandler: Finalizing recording with {len(complete_audio)} bytes total", flush=True)
            
            # Save complete recording file (WAV format from frontend)
            complete_file_path = f"sessions/{self.session_id}/recordings/{self.recording_id}.wav"
            await self.processor.save_complete_recording(
                recording_id=self.recording_id,
                session_id=self.session_id,
                audio_data=complete_audio,
                file_path=complete_file_path,
            )
            
            await self.processor.finalize_recording(
                self.recording_id,
                self.total_duration,
            )
            
            # Publish recording complete event for transcription
            from shared.schemas.events import RecordingCompleteEvent
            event = RecordingCompleteEvent(
                session_id=str(self.session_id),
                recording_id=str(self.recording_id),
                file_path=complete_file_path,
                duration_seconds=self.total_duration,
            )
            
            channel = f"recording:complete:{self.session_id}"
            print(f"AudioStreamHandler: Publishing recording complete to {channel}", flush=True)
            await redis_client.publish(channel, event.model_dump(mode="json"))
            
            try:
                await self.websocket.send_json({
                    "type": "end",
                    "data": {
                        "recording_id": str(self.recording_id),
                        "total_chunks": self.chunk_index,
                        "total_duration": self.total_duration,
                    },
                })
            except Exception:
                pass  # Connection may already be closed

