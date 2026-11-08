import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.database import init_db, get_db
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
    from backend.services.paypal_service import paypal_service
    from backend.services.llm_service import llm_service

    paypal_live = False
    if not settings.MOCK_MODE and not paypal_service.is_mock_mode:
        try:
            token = await paypal_service.get_access_token()
            paypal_live = bool(token and not token.startswith("mock_"))
        except Exception:
            paypal_live = False

    is_live = paypal_live and not settings.MOCK_MODE
    return {
        "status": "healthy",
        "env": settings.APP_ENV,
        "mode": "live" if is_live else "mock",
        "paypal_mode": "live" if paypal_live else "mock",
        "paypal_live_connected": paypal_live,
        "llm_provider": llm_service.active_provider,
        "llm_mode": "mock" if llm_service.is_mock_mode else "live",
    }


@app.get("/api/stats")
async def get_system_stats(db: AsyncSession = Depends(get_db)):
    from backend.api.jobs import get_job_stats
    return await get_job_stats(db)
