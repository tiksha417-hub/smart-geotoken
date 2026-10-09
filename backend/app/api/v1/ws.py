import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.connection_manager import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["WebSockets"])


@router.websocket("/location/{location_id}")
async def websocket_location_channel(websocket: WebSocket, location_id: int):
    """
    Subscribes to live queue updates, calls, and completions for a given facility.
    Used by counter staff monitors and public display boards.
    """
    channel = f"location:{location_id}"
    await manager.connect(websocket, channel)
    try:
        while True:
            # Keep socket alive and respond to client pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
    except Exception as e:
        logger.warning(f"WebSocket error in {channel}: {e}")
        manager.disconnect(websocket, channel)


@router.websocket("/token/{token_uuid}")
async def websocket_token_channel(websocket: WebSocket, token_uuid: str):
    """
    Subscribes to personal status updates for a specific customer's active token.
    Triggers instant state transition on customer's phone when called or activated.
    """
    channel = f"token:{token_uuid}"
    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
    except Exception as e:
        logger.warning(f"WebSocket error in {channel}: {e}")
        manager.disconnect(websocket, channel)
