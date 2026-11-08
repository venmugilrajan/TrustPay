import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.core.database import init_db
from backend.api.jobs import router as jobs_router
from backend.api.milestones import router as milestones_router
from backend.api.disputes import router as disputes_router
from backend.api.webhooks import router as webhooks_router
from backend.api.timeline import router as timeline_router
from backend.api.seed import router as seed_router

logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("trustpay")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    await init_db()
    logger.info("TrustPay Backend ready.")
    yield
    logger.info("TrustPay Backend shutting down.")


app = FastAPI(
    title="TrustPay API",
    description="Autonomous Escrow & Milestone Verification for PayPal AI Hackathon",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(jobs_router)
app.include_router(milestones_router)
app.include_router(disputes_router)
app.include_router(webhooks_router)
app.include_router(timeline_router)
app.include_router(seed_router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "env": settings.APP_ENV,
        "paypal_mode": "mock" if settings.PAYPAL_CLIENT_ID.startswith("your_") or not settings.PAYPAL_CLIENT_ID else "live",
        "llm_mode": "mock" if not settings.ANTHROPIC_API_KEY or settings.ANTHROPIC_API_KEY.startswith("your_") else "live",
    }
