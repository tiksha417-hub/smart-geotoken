import asyncio
import logging
from app.db.session import SessionLocal
from app.services.queue_service import QueueService
from app.core.config import settings

logger = logging.getLogger(__name__)


async def token_expiration_worker():
    """
    Background worker that runs periodically to expire stale pending or active tokens.
    """
    logger.info("Starting background token expiration worker...")
    while True:
        try:
            db = SessionLocal()
            try:
                expired_count = await QueueService.expire_stale_tokens(db)
                if expired_count > 0:
                    logger.info(f"Background task expired {expired_count} stale tokens.")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in token_expiration_worker: {e}")

        await asyncio.sleep(settings.TOKEN_EXPIRATION_CHECK_INTERVAL_SECONDS)
