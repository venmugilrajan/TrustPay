from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete

from backend.core.config import settings
from backend.core.database import get_db
from backend.models.models import (
    Job,
    Application,
    Contract,
    Milestone,
    AcceptanceCriterion,
    DeliverableSubmission,
    JudgeEvaluation,
    DisputeRecord,
    PaymentLedgerEntry,
    AuditLog,
    NegotiationTurn,
)
from backend.services.stats_service import stats_service

router = APIRouter(tags=["demo"])
logger = logging.getLogger("trustpay.api.demo")


@router.get("/api/demo/scenarios", response_model=List[dict])
async def list_demo_scenarios(db: AsyncSession = Depends(get_db)):
    """
    Returns available demonstration scenarios and their active status.
    """
    stmt = select(Job).where(Job.is_demo.is_(True)).order_by(Job.created_at.asc())
    res = await db.execute(stmt)
    demo_jobs = res.scalars().all()

    return [
        {
            "id": j.id,
            "title": j.title,
            "status": j.status,
            "max_budget": j.max_budget,
            "created_at": j.created_at.isoformat() if j.created_at else None,
        }
        for j in demo_jobs
    ]


@router.post("/api/demo/reset", response_model=dict)
async def reset_demo_data(db: AsyncSession = Depends(get_db)):
    """
    Idempotently deletes all data marked with is_demo=True.
    """
    # 1. Fetch demo job ids
    job_stmt = select(Job.id).where(Job.is_demo.is_(True))
    job_res = await db.execute(job_stmt)
    job_ids = job_res.scalars().all()

    if job_ids:
        # Delete related child records
        await db.execute(delete(AuditLog).where(AuditLog.job_id.in_(job_ids)))
        await db.execute(delete(PaymentLedgerEntry).where(PaymentLedgerEntry.job_id.in_(job_ids)))
        await db.execute(delete(NegotiationTurn).where(NegotiationTurn.job_id.in_(job_ids)))
        await db.execute(delete(Contract).where(Contract.job_id.in_(job_ids)))
        await db.execute(delete(Application).where(Application.job_id.in_(job_ids)))
        await db.execute(delete(Job).where(Job.id.in_(job_ids)))

    # Also clean any orphaned demo ledger entries
    await db.execute(delete(PaymentLedgerEntry).where(PaymentLedgerEntry.is_demo.is_(True)))
    await db.commit()

    return {
        "status": "reset_complete",
        "deleted_demo_jobs_count": len(job_ids),
        "message": "All demonstration jobs, applications, contracts, and ledger entries have been cleanly wiped.",
    }


@router.post("/api/demo/seed", response_model=dict)
async def seed_demo_scenarios(db: AsyncSession = Depends(get_db)):
    """
    Seeds exactly 3 realistic, coherent, and isolated demonstration scenarios:
    1. Scenario A: Complete Success (Passed milestones, 100% captured via PayPal)
    2. Scenario B: Partial Delivery (Proportional capture for partial score)
    3. Scenario C: Active Dispute (Under arbitration by AI Dispute Agent)
    """
    # First cleanly wipe existing demo records for idempotency
    await reset_demo_data(db)

    now = datetime.now(timezone.utc)

    # =========================================================================
    # SCENARIO A: Complete Success (FastAPI ETL Pipeline)
    # =========================================================================
    job_a = Job(
        id=str(uuid.uuid4()),
        client_id="client_maya",
        title="High-Throughput Financial ETL Pipeline",
        description="Design and implement an asynchronous Python ETL pipeline for financial records with SQLite persistence.",
        deliverables="Containerized pipeline with automated test suite and throughput benchmarks.",
        max_budget=1200.00,
        public_budget_estimate="$1,200.00 USD",
        currency="USD",
        deadline=(now + timedelta(days=20)).strftime("%Y-%m-%d"),
        priorities="quality",
        must_haves="Asynchronous worker pool, zero data corruption",
        status="completed",
        is_demo=True,
        client_approved=True,
        freelancer_approved=True,
        paypal_authorization_id="AUTH-DEMO-SCENARIO-A",
        paypal_status="CAPTURED",
        created_at=now - timedelta(days=5),
    )
    db.add(job_a)
    await db.flush()

    app_a = Application(
        id=str(uuid.uuid4()),
        job_id=job_a.id,
        freelancer_id="freelancer_arjun",
        freelancer_name="Arjun Kumar",
        min_price=1000.00,
        preferred_price=1200.00,
        time_needed_days=14,
        skills="Python, AsyncIO, SQLite, Docker",
        exclusions="Excludes cloud server provisioning",
        notes="Senior Systems Engineer with fintech ETL background.",
        status="funded",
        client_accepted=True,
        freelancer_accepted=True,
        created_at=now - timedelta(days=5),
    )
    db.add(app_a)
    await db.flush()

    contract_a = Contract(
        id=str(uuid.uuid4()),
        job_id=job_a.id,
        application_id=app_a.id,
        total_amount=1200.00,
        currency="USD",
        deadline=job_a.deadline,
        status="completed",
        created_at=now - timedelta(days=5),
    )
    db.add(contract_a)
    await db.flush()
    job_a.active_contract_id = contract_a.id

    # Milestone 1 (Passed & Paid $600)
    m1_a = Milestone(
        id=str(uuid.uuid4()),
        contract_id=contract_a.id,
        order_index=0,
        title="Pipeline Core Architecture & Ingestion Workers",
        description="Asynchronous ingestion engine supporting batches of 10,000 transactions/sec.",
        amount=600.00,
        due_date=(now - timedelta(days=3)).strftime("%Y-%m-%d"),
        status="paid",
        score=1.00,
        captured_amount=600.00,
        paid_amount=600.00,
        paypal_capture_id="CAP-DEMO-A1-PASSED",
    )
    db.add(m1_a)
    await db.flush()

    # Milestone 2 (Passed & Paid $600)
    m2_a = Milestone(
        id=str(uuid.uuid4()),
        contract_id=contract_a.id,
        order_index=1,
        title="Deduplication Engine & Benchmark Tests",
        description="Zero-loss deduplication algorithm with comprehensive Pytest suite.",
        amount=600.00,
        due_date=(now - timedelta(days=1)).strftime("%Y-%m-%d"),
        status="paid",
        score=0.96,
        captured_amount=600.00,
        paid_amount=600.00,
        paypal_capture_id="CAP-DEMO-A2-PASSED",
    )
    db.add(m2_a)
    await db.flush()

    # Ledger entries for Scenario A
    await stats_service.record_ledger_entry(
        db, job_a.id, contract_a.id, None, "authorized", 1200.00, "AUTH-DEMO-SCENARIO-A", "client", "PayPal escrow authorization", is_demo=True
    )
    await stats_service.record_ledger_entry(
        db, job_a.id, contract_a.id, m1_a.id, "captured", 600.00, "CAP-DEMO-A1-PASSED", "paypal", "Milestone 1 full capture", is_demo=True
    )
    await stats_service.record_ledger_entry(
        db, job_a.id, contract_a.id, m2_a.id, "captured", 600.00, "CAP-DEMO-A2-PASSED", "paypal", "Milestone 2 full capture", is_demo=True
    )

    # =========================================================================
    # SCENARIO B: Partial Delivery (ZK Proof Verifier)
    # =========================================================================
    job_b = Job(
        id=str(uuid.uuid4()),
        client_id="client_northwind",
        title="Zero-Knowledge Proof Rollup Verifier",
        description="Construct WebAssembly cryptographic verifier circuit for zk-SNARK proof verification.",
        deliverables="Wasm verifier module with automated benchmark tests.",
        max_budget=1500.00,
        public_budget_estimate="$1,500.00 USD",
        currency="USD",
        deadline=(now + timedelta(days=15)).strftime("%Y-%m-%d"),
        priorities="quality",
        status="in_progress",
        is_demo=True,
        client_approved=True,
        freelancer_approved=True,
        paypal_authorization_id="AUTH-DEMO-SCENARIO-B",
        paypal_status="AUTHORIZED",
        created_at=now - timedelta(days=3),
    )
    db.add(job_b)
    await db.flush()

    app_b = Application(
        id=str(uuid.uuid4()),
        job_id=job_b.id,
        freelancer_id="freelancer_sofia",
        freelancer_name="Sofia Reyes",
        min_price=1300.00,
        preferred_price=1500.00,
        time_needed_days=12,
        skills="Rust, WebAssembly, Cryptography",
        status="funded",
        client_accepted=True,
        freelancer_accepted=True,
        created_at=now - timedelta(days=3),
    )
    db.add(app_b)
    await db.flush()

    contract_b = Contract(
        id=str(uuid.uuid4()),
        job_id=job_b.id,
        application_id=app_b.id,
        total_amount=1500.00,
        currency="USD",
        deadline=job_b.deadline,
        status="in_progress",
        created_at=now - timedelta(days=3),
    )
    db.add(contract_b)
    await db.flush()
    job_b.active_contract_id = contract_b.id

    # Milestone 1: Passed & Paid $500
    m1_b = Milestone(
        id=str(uuid.uuid4()),
        contract_id=contract_b.id,
        order_index=0,
        title="Wasm Circuit Architecture",
        description="Core circuit verifier setup.",
        amount=500.00,
        due_date=(now - timedelta(days=1)).strftime("%Y-%m-%d"),
        status="paid",
        score=1.00,
        captured_amount=500.00,
        paid_amount=500.00,
        paypal_capture_id="CAP-DEMO-B1-PASSED",
    )
    db.add(m1_b)

    # Milestone 2: Partial Delivery (Score 0.60 -> $300 captured, $200 refunded)
    m2_b = Milestone(
        id=str(uuid.uuid4()),
        contract_id=contract_b.id,
        order_index=1,
        title="Proof Aggregation & Batch Checking",
        description="Batch verifier implementation.",
        amount=500.00,
        due_date=(now + timedelta(days=5)).strftime("%Y-%m-%d"),
        status="partial",
        score=0.60,
        captured_amount=300.00,
        paid_amount=300.00,
        paypal_capture_id="CAP-DEMO-B2-PARTIAL",
    )
    db.add(m2_b)

    # Milestone 3: Pending
    m3_b = Milestone(
        id=str(uuid.uuid4()),
        contract_id=contract_b.id,
        order_index=2,
        title="Comprehensive Edge-Case Fuzzing",
        description="Fuzzing harness with 1,000 edge case proofs.",
        amount=500.00,
        due_date=(now + timedelta(days=12)).strftime("%Y-%m-%d"),
        status="pending",
    )
    db.add(m3_b)
    await db.flush()

    await stats_service.record_ledger_entry(
        db, job_b.id, contract_b.id, None, "authorized", 1500.00, "AUTH-DEMO-SCENARIO-B", "client", "PayPal escrow authorization", is_demo=True
    )
    await stats_service.record_ledger_entry(
        db, job_b.id, contract_b.id, m1_b.id, "captured", 500.00, "CAP-DEMO-B1-PASSED", "paypal", "Milestone 1 full capture", is_demo=True
    )
    await stats_service.record_ledger_entry(
        db, job_b.id, contract_b.id, m2_b.id, "captured", 300.00, "CAP-DEMO-B2-PARTIAL", "paypal", "Milestone 2 partial capture (60%)", is_demo=True
    )
    await stats_service.record_ledger_entry(
        db, job_b.id, contract_b.id, m2_b.id, "refunded", 200.00, "REF-DEMO-B2-UNCLAIMED", "paypal", "Milestone 2 unearned refund (40%)", is_demo=True
    )

    # =========================================================================
    # SCENARIO C: Active Dispute under Arbitration (Kafka Event Stream)
    # =========================================================================
    job_c = Job(
        id=str(uuid.uuid4()),
        client_id="client_maya",
        title="Kafka Distributed Event Stream Cluster",
        description="Configure high-availability Kafka cluster with automated broker failover and schema registry.",
        deliverables="Docker compose cluster with automated chaos testing scripts.",
        max_budget=900.00,
        public_budget_estimate="$900.00 USD",
        currency="USD",
        deadline=(now + timedelta(days=8)).strftime("%Y-%m-%d"),
        priorities="quality",
        status="disputed",
        is_demo=True,
        client_approved=True,
        freelancer_approved=True,
        paypal_authorization_id="AUTH-DEMO-SCENARIO-C",
        paypal_status="AUTHORIZED",
        created_at=now - timedelta(days=2),
    )
    db.add(job_c)
    await db.flush()

    app_c = Application(
        id=str(uuid.uuid4()),
        job_id=job_c.id,
        freelancer_id="freelancer_arjun",
        freelancer_name="Arjun Kumar",
        min_price=800.00,
        preferred_price=900.00,
        time_needed_days=7,
        skills="Kafka, Docker, Chaos Engineering",
        status="funded",
        client_accepted=True,
        freelancer_accepted=True,
        created_at=now - timedelta(days=2),
    )
    db.add(app_c)
    await db.flush()

    contract_c = Contract(
        id=str(uuid.uuid4()),
        job_id=job_c.id,
        application_id=app_c.id,
        total_amount=900.00,
        currency="USD",
        deadline=job_c.deadline,
        status="disputed",
        created_at=now - timedelta(days=2),
    )
    db.add(contract_c)
    await db.flush()
    job_c.active_contract_id = contract_c.id

    m1_c = Milestone(
        id=str(uuid.uuid4()),
        contract_id=contract_c.id,
        order_index=0,
        title="Cluster Formation & Broker Failover",
        description="3-broker cluster with automatic partition leader re-election.",
        amount=450.00,
        due_date=(now - timedelta(hours=12)).strftime("%Y-%m-%d"),
        status="disputed",
        score=0.45,
    )
    db.add(m1_c)

    m2_c = Milestone(
        id=str(uuid.uuid4()),
        contract_id=contract_c.id,
        order_index=1,
        title="Schema Registry Integration",
        description="Avro serialization and compatibility policies.",
        amount=450.00,
        due_date=(now + timedelta(days=6)).strftime("%Y-%m-%d"),
        status="pending",
    )
    db.add(m2_c)
    await db.flush()

    # Dispute Record under arbitration
    dispute_c = DisputeRecord(
        id=str(uuid.uuid4()),
        milestone_id=m1_c.id,
        raised_by="client",
        reason="Failover tests failed during partition leader kill simulation. Missing automated rebalance configuration.",
        status="investigating",
        ruling="AI Dispute Arbitrator reviewing container chaos logs and milestone criteria...",
        created_at=now - timedelta(hours=6),
    )
    db.add(dispute_c)

    await stats_service.record_ledger_entry(
        db, job_c.id, contract_c.id, None, "authorized", 900.00, "AUTH-DEMO-SCENARIO-C", "client", "PayPal escrow authorization", is_demo=True
    )

    await db.commit()

    return {
        "status": "seeded",
        "scenarios": [
            {"name": "Complete Success (ETL Pipeline)", "job_id": job_a.id, "amount": 1200.00, "status": "completed"},
            {"name": "Partial Delivery (ZK Verifier)", "job_id": job_b.id, "amount": 1500.00, "status": "in_progress"},
            {"name": "Active Dispute (Kafka Cluster)", "job_id": job_c.id, "amount": 900.00, "status": "disputed"},
        ],
        "message": "3 demo scenarios successfully seeded and recorded into the single-source-of-truth payments ledger.",
    }

