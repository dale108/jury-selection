"""Gateway routing - proxies requests to microservices."""
from fastapi import APIRouter, Request, Response, WebSocket, WebSocketDisconnect, HTTPException
import httpx
import websockets

from .config import settings

router = APIRouter()


async def proxy_request(request: Request, service_url: str, path: str) -> Response:
    """Proxy HTTP request to a microservice."""
    url = f"{service_url}{path}"
    
    # Get query params
    query_params = dict(request.query_params)
    
    # Get headers (exclude host)
    headers = {k: v for k, v in request.headers.items() if k.lower() != "host"}
    
    # Get body
    body = await request.body()
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.request(
                method=request.method,
                url=url,
                params=query_params,
                headers=headers,
                content=body,
                timeout=30.0,
            )
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers),
            )
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail=f"Service unavailable: {service_url}")


# Session routes
@router.api_route("/sessions/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_sessions(request: Request, path: str = ""):
    """Proxy session service requests."""
    return await proxy_request(request, settings.session_service_url, f"/sessions/{path}")


@router.api_route("/sessions", methods=["GET", "POST"])
async def proxy_sessions_root(request: Request):
    """Proxy session service root requests."""
    return await proxy_request(request, settings.session_service_url, "/sessions/")


# Juror routes
@router.api_route("/jurors/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_jurors(request: Request, path: str = ""):
    """Proxy juror service requests."""
    return await proxy_request(request, settings.juror_service_url, f"/jurors/{path}")


@router.api_route("/jurors", methods=["GET", "POST"])
async def proxy_jurors_root(request: Request):
    """Proxy juror service root requests."""
    return await proxy_request(request, settings.juror_service_url, "/jurors/")


# Audio routes
@router.api_route("/audio/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_audio(request: Request, path: str = ""):
    """Proxy audio service requests."""
    return await proxy_request(request, settings.audio_service_url, f"/audio/{path}")


# Transcript routes
@router.api_route("/transcripts/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_transcripts(request: Request, path: str = ""):
    """Proxy transcription service requests."""
    return await proxy_request(request, settings.transcription_service_url, f"/transcripts/{path}")


@router.api_route("/transcripts", methods=["GET"])
async def proxy_transcripts_root(request: Request):
    """Proxy transcription service root requests."""
    return await proxy_request(request, settings.transcription_service_url, "/transcripts/")


# WebSocket proxying for audio streaming
@router.websocket("/audio/stream/{session_id}")
async def websocket_audio_stream(websocket: WebSocket, session_id: str):
    """Proxy WebSocket connection to audio service."""
    await websocket.accept()
    
    # Convert HTTP URL to WebSocket URL
    ws_url = settings.audio_service_url.replace("http://", "ws://").replace("https://", "wss://")
    ws_url = f"{ws_url}/audio/stream/{session_id}"
    
    try:
        async with websockets.connect(ws_url) as backend_ws:
            import asyncio
            
            async def forward_to_backend():
                """Forward messages from client to backend."""
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        await backend_ws.send(data)
                except WebSocketDisconnect:
                    pass
            
            async def forward_to_client():
                """Forward messages from backend to client."""
                try:
                    async for message in backend_ws:
                        if isinstance(message, bytes):
                            await websocket.send_bytes(message)
                        else:
                            await websocket.send_text(message)
                except websockets.exceptions.ConnectionClosed:
                    pass
            
            # Run both directions concurrently
            await asyncio.gather(forward_to_backend(), forward_to_client())
            
    except Exception as e:
        await websocket.close(code=1011, reason=str(e))


# WebSocket proxying for live transcripts
@router.websocket("/transcripts/live/{session_id}")
async def websocket_transcript_live(websocket: WebSocket, session_id: str):
    """Proxy WebSocket connection to transcription service."""
    await websocket.accept()
    
    # Convert HTTP URL to WebSocket URL
    ws_url = settings.transcription_service_url.replace("http://", "ws://").replace("https://", "wss://")
    ws_url = f"{ws_url}/transcripts/live/{session_id}"
    
    try:
        async with websockets.connect(ws_url) as backend_ws:
            import asyncio
            
            async def forward_to_client():
                """Forward messages from backend to client."""
                try:
                    async for message in backend_ws:
                        await websocket.send_text(message)
                except websockets.exceptions.ConnectionClosed:
                    pass
            
            async def keep_alive():
                """Keep connection alive with pings."""
                try:
                    while True:
                        await asyncio.sleep(30)
                        await websocket.send_text('{"type": "ping"}')
                except WebSocketDisconnect:
                    pass
            
            await asyncio.gather(forward_to_client(), keep_alive())
            
    except Exception as e:
        await websocket.close(code=1011, reason=str(e))

