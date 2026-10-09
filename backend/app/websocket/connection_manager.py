import json
import logging
from typing import Dict, List, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages real-time WebSocket connections partitioned into channels:
    - location rooms for staff & public displays
    - personal token channels for individual customer live passes
    """

    def __init__(self):
        # channel_name -> Set[WebSocket]
        self.rooms: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.rooms:
            self.rooms[channel] = set()
        self.rooms[channel].add(websocket)
        logger.info(f"WebSocket client joined channel: {channel} (Total: {len(self.rooms[channel])})")

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.rooms:
            self.rooms[channel].discard(websocket)
            if not self.rooms[channel]:
                del self.rooms[channel]
        logger.info(f"WebSocket client disconnected from channel: {channel}")

    async def broadcast_to_channel(self, channel: str, message: dict):
        if channel not in self.rooms:
            return

        payload = json.dumps(message)
        dead_sockets = set()

        for connection in list(self.rooms[channel]):
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Failed to send to client in {channel}: {e}")
                dead_sockets.add(connection)

        for dead in dead_sockets:
            self.rooms[channel].discard(dead)

    async def broadcast_location_update(self, location_id: int, event_type: str, data: dict):
        """Broadcasts live queue changes to all staff and monitors at a location."""
        channel = f"location:{location_id}"
        message = {
            "channel": channel,
            "event": event_type,
            "data": data
        }
        await self.broadcast_to_channel(channel, message)

    async def send_token_update(self, token_uuid: str, event_type: str, data: dict):
        """Sends targeted update to a specific customer's active token screen."""
        channel = f"token:{token_uuid}"
        message = {
            "channel": channel,
            "event": event_type,
            "data": data
        }
        await self.broadcast_to_channel(channel, message)


manager = ConnectionManager()
