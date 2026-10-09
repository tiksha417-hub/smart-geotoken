import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.api.v1 import api_v1_router
from app.services.background import token_expiration_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database schema is created
    Base.metadata.create_all(bind=engine)

    # Launch background token expiration task
    expiration_task = asyncio.create_task(token_expiration_worker())

    yield

    # Shutdown: Cancel background task
    expiration_task.cancel()
    try:
        await expiration_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Geo-Intelligent Smart Token Generation & Queue Management System API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 routes
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Health"])
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_PREFIX
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
