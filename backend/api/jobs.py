import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.core.config import settings
from backend.core.database import get_db
from backend.core.auth import get_current_user, get_optional_user, TokenUser, require_client, require_freelancer
from backend.models.models import (
    Job,
    Application,
    Contract,
    Milestone,
    AcceptanceCriterion,
    NegotiationTurn,
    DeliverableSubmission,
    PaymentLedgerEntry,
    AuditLog,
)
from backend.schemas.schemas import (
    JobCreateRequest,
    ApplicationCreateRequest,
    ApprovalRequest,
)
from backend.services.stats_service import stats_service
from backend.services.paypal_service import paypal_service

router = APIRouter(tags=["jobs"])
logger = logging.getLogger("trustpay.api.jobs")


async def add_audit_log(
    db: AsyncSession,
    job_id: str,
    event_type: str,
    actor: str,
    details: dict,
):
    log = AuditLog(
        job_id=job_id,
        event_type=event_type,
        actor=actor,
        details=details,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log)


def normalize_uid(uid: Optional[str]) -> str:
    if not uid:
        return ""
    clean = str(uid).replace("-", "_").lower().strip()
    if clean in ("freelancer_default", "freelancer"):
        return "freelancer_arjun"
    if clean in ("client_default", "client"):
        return "client_maya"
    return clean


async def load_job_with_relations(db: AsyncSession, job_id: str) -> Optional[Job]:
    stmt = (
        select(Job)
        .where(Job.id == job_id)
        .options(
            selectinload(Job.active_contract)
            .selectinload(Contract.milestones)
            .selectinload(Milestone.acceptance_criteria),
            selectinload(Job.active_contract)
            .selectinload(Contract.milestones)
            .selectinload(Milestone.submissions)
            .selectinload(DeliverableSubmission.evaluations),
            selectinload(Job.active_contract)
            .selectinload(Contract.milestones)
            .selectinload(Milestone.disputes),
            selectinload(Job.contracts)
            .selectinload(Contract.milestones)
            .selectinload(Milestone.acceptance_criteria),
            selectinload(Job.contracts)
            .selectinload(Contract.milestones)
            .selectinload(Milestone.submissions)
            .selectinload(DeliverableSubmission.evaluations),
            selectinload(Job.contracts)
            .selectinload(Contract.milestones)
            .selectinload(Milestone.disputes),
            selectinload(Job.applications).selectinload(Application.contract).selectinload(Contract.milestones).selectinload(Milestone.acceptance_criteria),
            selectinload(Job.applications).selectinload(Application.contract).selectinload(Contract.milestones).selectinload(Milestone.submissions).selectinload(DeliverableSubmission.evaluations),
            selectinload(Job.applications).selectinload(Application.contract).selectinload(Contract.milestones).selectinload(Milestone.disputes),
            selectinload(Job.applications).selectinload(Application.negotiation_turns),
            selectinload(Job.negotiation_turns),
            selectinload(Job.audit_logs),
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


# =========================================================================
# CLIENT JOBS ENDPOINTS
# =========================================================================

@router.post("/api/jobs", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_job(
    request: JobCreateRequest,
    current_user: TokenUser = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new job posting owned by the authenticated client.
    max_budget is strictly stored and private.
    """
    job = Job(
        client_id=current_user.user_id,
        title=request.title,
        description=request.description,
        deliverables=request.deliverables,
        max_budget=request.max_budget,
        public_budget_estimate=request.public_budget_estimate,
        currency=request.currency,
        deadline=request.deadline,
        priorities=request.priorities,
        must_haves=request.must_haves,
        status="open",
    )
    db.add(job)
    await db.flush()

    await add_audit_log(
        db,
        job.id,
        "JOB_CREATED",
        "client",
        {
            "title": job.title,
            "max_budget": job.max_budget,
            "deadline": job.deadline,
            "client_id": current_user.user_id,
        },
    )
    await db.commit()

    return {"id": job.id, "status": job.status, "message": "Job created in open status. Awaiting applications."}


@router.get("/api/client/jobs", response_model=List[dict])
async def list_client_jobs(
    current_user: TokenUser = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists jobs posted by the authenticated client.
    Includes client's own private max_budget.
    """
    stmt = (
        select(Job)
        .where(Job.client_id == current_user.user_id)
        .options(
            selectinload(Job.applications),
            selectinload(Job.active_contract).selectinload(Contract.milestones),
        )
        .order_by(Job.created_at.desc())
    )
    result = await db.execute(stmt)
    jobs = result.scalars().all()

    out = []
    for j in jobs:
        assigned_app = next(
            (a for a in j.applications if a.status in ("approved", "funded")),
            None,
        )
        if assigned_app and assigned_app.freelancer_name:
            freelancer_name = assigned_app.freelancer_name
        elif j.status in ("approved", "funded", "in_progress", "completed", "disputed"):
            freelancer_name = (
                "Sofia Reyes"
                if "kafka" in (j.title or "").lower()
                else "Arjun Kumar"
            )
        else:
            freelancer_name = None

        active_c = j.active_contract
        contract_data = None
        if active_c:
            contract_data = {
                "id": active_c.id,
                "total_amount": active_c.total_amount,
                "currency": active_c.currency,
                "status": active_c.status,
                "deadline": active_c.deadline,
                "milestones": [
                    {
                        "id": m.id,
                        "title": m.title,
                        "description": m.description,
                        "amount": m.amount,
                        "status": m.status,
                        "captured_amount": m.captured_amount,
                        "paid_amount": m.paid_amount,
                    }
                    for m in (active_c.milestones or [])
                ],
            }

        out.append({
            "id": j.id,
            "client_id": j.client_id,
            "title": j.title,
            "description": j.description,
            "deliverables": j.deliverables,
            "max_budget": j.max_budget,
            "public_budget_estimate": j.public_budget_estimate or "Negotiable",
            "currency": j.currency,
            "deadline": j.deadline,
            "priorities": j.priorities,
            "must_haves": j.must_haves,
            "status": j.status,
            "applications_count": len(j.applications) if j.applications else 0,
            "assigned_freelancer_name": freelancer_name,
            "contract": contract_data,
            "contract_amount": active_c.total_amount if active_c else None,
            "applications": [
                {
                    "id": a.id,
                    "freelancer_id": a.freelancer_id,
                    "freelancer_name": a.freelancer_name,
                    "status": a.status,
                }
                for a in j.applications
            ] if j.applications else [],
            "client_approved": j.client_approved,
            "freelancer_approved": j.freelancer_approved,
            "paypal_status": j.paypal_status,
            "is_demo": bool(getattr(j, "is_demo", False)),
            "created_at": j.created_at.isoformat() if j.created_at else None,
        })
    return out


def serialize_contract_model(c: Optional[Contract]) -> Optional[dict]:
    if not c:
        return None
    return {
        "id": c.id,
        "job_id": c.job_id,
        "application_id": c.application_id,
        "total_amount": c.total_amount,
        "currency": c.currency,
        "deadline": c.deadline,
        "status": c.status,
        "milestones": [
            {
                "id": m.id,
                "order_index": m.order_index,
                "title": m.title,
                "description": m.description,
                "amount": m.amount,
                "due_date": m.due_date,
                "status": m.status,
                "captured_amount": m.captured_amount,
                "paid_amount": getattr(m, "paid_amount", 0.0),
                "score": getattr(m, "score", None),
                "resubmission_count": getattr(m, "resubmissions_used", 0),
                "acceptance_criteria": [
                    {"id": ac.criterion_key, "text": ac.text, "weight": ac.weight}
                    for ac in (getattr(m, "acceptance_criteria", None) or [])
                ],
                "submissions": [
                    {
                        "id": s.id,
                        "milestone_id": s.milestone_id,
                        "submission_type": s.submission_type,
                        "content_text": s.content_text,
                        "file_path": s.file_path,
                        "version": s.version,
                        "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
                        "evaluations": [
                            {
                                "id": ev.id,
                                "submission_id": ev.submission_id,
                                "score": ev.overall_score,
                                "overall_score": ev.overall_score,
                                "verdict": ev.verdict,
                                "feedback_for_freelancer": ev.feedback_for_freelancer,
                                "per_criterion_results": ev.per_criterion_results or [],
                                "sandbox_evidence": ev.sandbox_evidence or {},
                                "test_stdout": ev.test_stdout,
                                "test_stderr": ev.test_stderr,
                                "prompt_injection_flag": ev.prompt_injection_flag,
                                "evaluated_at": ev.evaluated_at.isoformat() if ev.evaluated_at else None,
                            }
                            for ev in (getattr(s, "evaluations", None) or [])
                        ],
                    }
                    for s in (getattr(m, "submissions", None) or [])
                ],
                "disputes": [
                    {
                        "id": d.id,
                        "milestone_id": d.milestone_id,
                        "raised_by": d.raised_by,
                        "reason": d.reason,
                        "status": d.status,
                        "ruling": d.ruling,
                        "refund_amount": d.refund_amount,
                        "capture_amount": d.capture_amount,
                        "created_at": d.created_at.isoformat() if d.created_at else None,
                    }
                    for d in (getattr(m, "disputes", None) or [])
                ],
            }
            for m in (getattr(c, "milestones", None) or [])
        ],
    }


async def ensure_three_milestones(db: AsyncSession, contract: Optional[Contract], deadline: str):
    """Ensures draft/pending contracts have exactly 3 structured milestones."""
    if not contract or not contract.milestones:
        return
    if len(contract.milestones) == 2 and contract.status not in ("funded", "completed"):
        has_submissions = any(bool(getattr(m, "submissions", None)) for m in contract.milestones)
        if not has_submissions:
            total_amt = contract.total_amount
            m1_amt = round(total_amt * 0.35, 2)
            m2_amt = round(total_amt * 0.35, 2)
            m3_amt = round(total_amt - m1_amt - m2_amt, 2)
            for old_m in list(contract.milestones):
                await db.delete(old_m)
            await db.flush()
            specs = [
                ("Core Architecture & Data Layer", "Implement foundational logic, database models, and unit test harness.", m1_amt),
                ("Business Logic & Core Services", "Implement asynchronous workflows, validation policies, and core endpoints.", m2_amt),
                ("Integration, Security & Production Delivery", "Deliver end-to-end user workflows, API integration, and sandbox test suite.", m3_amt),
            ]
            new_ms = []
            for idx, (title, desc, amt) in enumerate(specs):
                ms = Milestone(
                    contract_id=contract.id,
                    order_index=idx,
                    title=title,
                    description=desc,
                    amount=amt,
                    due_date=deadline,
                    status="pending",
                )
                db.add(ms)
                await db.flush()
                crit = AcceptanceCriterion(
                    milestone_id=ms.id,
                    criterion_key=f"c{idx+1}",
                    text=f"Automated verification criteria for {title}",
                    weight=1.0,
                )
                db.add(crit)
                new_ms.append(ms)
            contract.milestones = new_ms
            await db.commit()


@router.get("/api/client/jobs/{job_id}", response_model=dict)
async def get_client_job(
    job_id: str,
    app_id: Optional[str] = Query(None),
    current_user: TokenUser = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves full details of a client's own job.
    Cross-client access is strictly forbidden.
    """
    job = await load_job_with_relations(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.client_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-client access denied: You cannot view jobs created by other clients.",
        )

    target_contract = None
    if app_id:
        target_app = next((a for a in (job.applications or []) if a.id == app_id), None)
        if target_app and target_app.contract:
            target_contract = target_app.contract
        elif job.contracts:
            target_contract = next((c for c in job.contracts if c.application_id == app_id), None)
    if not target_contract:
        target_contract = job.active_contract or (job.contracts[0] if job.contracts else None)

    await ensure_three_milestones(db, target_contract, job.deadline)
    contract_data = serialize_contract_model(target_contract)

    return {
        "id": job.id,
        "client_id": job.client_id,
        "title": job.title,
        "description": job.description,
        "deliverables": job.deliverables,
        "max_budget": job.max_budget,
        "public_budget_estimate": job.public_budget_estimate or "Negotiable",
        "currency": job.currency,
        "deadline": job.deadline,
        "priorities": job.priorities,
        "must_haves": job.must_haves,
        "status": job.status,
        "client_approved": job.client_approved,
        "freelancer_approved": job.freelancer_approved,
        "is_demo": bool(getattr(job, "is_demo", False)),
        "paypal_order_id": job.paypal_order_id,
        "paypal_authorization_id": job.paypal_authorization_id,
        "paypal_status": job.paypal_status,
        "authorization_expires_at": job.authorization_expires_at,
        "contract": contract_data,
        "applications": [
            {
                "id": a.id,
                "freelancer_id": a.freelancer_id,
                "freelancer_name": (
                    "Sofia Reyes"
                    if "sofia" in (a.freelancer_id or "").lower()
                    else "Arjun Kumar"
                    if not a.freelancer_name or a.freelancer_name in ("Senior Full-Stack Engineer", "Alex (Verified)", "Freelancer Agent")
                    else a.freelancer_name
                ),
                "freelancer_title": "Backend & Data Pipeline Specialist" if "sofia" in (a.freelancer_id or "").lower() else "Full-Stack & Systems Engineer",
                "preferred_price": a.preferred_price,
                "time_needed_days": a.time_needed_days,
                "skills": a.skills,
                "exclusions": a.exclusions,
                "notes": a.notes,
                "status": a.status,
                "client_accepted": a.client_accepted,
                "freelancer_accepted": a.freelancer_accepted,
                "counters_used": a.counters_used,
                "contract": serialize_contract_model(a.contract or next((c for c in (job.contracts or []) if c.application_id == a.id), None)),
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in job.applications
        ],
        "audit_logs": [
            {
                "id": log.id,
                "event_type": log.event_type,
                "actor": log.actor,
                "details": log.details,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            }
            for log in job.audit_logs
        ],
        "negotiation_turns": [
            {
                "id": t.id,
                "round_number": t.round_number,
                "agent_role": t.agent_role or ("client" if t.sender == "client_agent" else "freelancer"),
                "sender": t.sender or f"{t.agent_role}_agent",
                "message": t.message,
                "proposal_summary": t.proposal_summary,
                "proposed_price": t.proposed_price,
                "price_change_reason": t.price_change_reason,
                "agreed": bool(t.agreed),
                "created_at": t.timestamp.isoformat() if t.timestamp else None,
            }
            for t in sorted(
                list(set((job.negotiation_turns or []) + [
                    turn for app in (job.applications or []) for turn in (app.negotiation_turns or [])
                ])),
                key=lambda x: (x.round_number, x.timestamp.isoformat() if x.timestamp else "")
            )
        ],
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }


@router.get("/api/client/payments", response_model=List[dict])
async def list_client_payments(
    current_user: TokenUser = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists payments ledger entries for contracts belonging to the authenticated client.
    """
    job_stmt = select(Job.id).where(Job.client_id == current_user.user_id)
    job_res = await db.execute(job_stmt)
    job_ids = job_res.scalars().all()

    if not job_ids:
        return []

    stmt = (
        select(PaymentLedgerEntry)
        .where(PaymentLedgerEntry.job_id.in_(job_ids))
        .order_by(PaymentLedgerEntry.created_at.desc())
    )
    res = await db.execute(stmt)
    entries = res.scalars().all()

    return [
        {
            "id": e.id,
            "job_id": e.job_id,
            "contract_id": e.contract_id,
            "milestone_id": e.milestone_id,
            "type": e.type,
            "amount": e.amount,
            "currency": e.currency,
            "paypal_id": e.paypal_id,
            "actor": e.actor,
            "note": e.note,
            "is_demo": e.is_demo,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]


@router.get("/api/client/stats", response_model=dict)
async def get_client_statistics(
    current_user: TokenUser = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns financial and contract metrics for the client from payments_ledger.
    """
    return await stats_service.get_client_stats(db, current_user.user_id)


# =========================================================================
# FREELANCER OPPORTUNITIES & WORK ENDPOINTS
# =========================================================================

@router.get("/api/opportunities", response_model=List[dict])
async def list_opportunities(
    current_user: Optional[TokenUser] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Freelancer portal browse endpoint. Lists open jobs.
    NEVER leaks max_budget. Displays public_budget_estimate or 'Negotiable'.
    """
    stmt = (
        select(Job)
        .where(Job.status.in_(["open", "in_negotiation"]))
        .options(selectinload(Job.applications))
        .order_by(Job.created_at.desc())
    )
    result = await db.execute(stmt)
    jobs = result.scalars().all()

    if current_user and current_user.role == "freelancer":
        jobs = [
            j for j in jobs
            if not any(a.freelancer_id == current_user.user_id for a in (j.applications or []))
        ]

    out = []
    for j in jobs:
        out.append({
            "id": j.id,
            "title": j.title,
            "description": j.description,
            "deliverables": j.deliverables,
            "public_budget_estimate": j.public_budget_estimate or "Negotiable",
            "currency": j.currency,
            "deadline": j.deadline,
            "priorities": j.priorities,
            "must_haves": j.must_haves,
            "status": j.status,
            "applications_count": len(j.applications) if j.applications else 0,
            "is_demo": bool(getattr(j, "is_demo", False)),
            "created_at": j.created_at.isoformat() if j.created_at else None,
        })
    return out


@router.get("/api/opportunities/{job_id}", response_model=dict)
async def get_opportunity(
    job_id: str,
    current_user: Optional[TokenUser] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Details of a single opportunity for freelancers.
    NEVER leaks max_budget.
    """
    stmt = (
        select(Job)
        .where(Job.id == job_id)
        .options(selectinload(Job.applications))
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Opportunity not found.")

    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "deliverables": job.deliverables,
        "public_budget_estimate": job.public_budget_estimate or "Negotiable",
        "currency": job.currency,
        "deadline": job.deadline,
        "priorities": job.priorities,
        "must_haves": job.must_haves,
        "status": job.status,
        "applications_count": len(job.applications) if job.applications else 0,
        "is_demo": bool(getattr(job, "is_demo", False)),
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }


@router.get("/api/freelancer/applications", response_model=List[dict])
async def list_freelancer_applications(
    current_user: TokenUser = Depends(require_freelancer),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists applications submitted by the authenticated freelancer.
    Includes the freelancer's own private min_price.
    """
    stmt = (
        select(Application)
        .where(Application.freelancer_id == current_user.user_id)
        .options(
            selectinload(Application.job),
            selectinload(Application.contract).selectinload(Contract.milestones),
        )
        .order_by(Application.created_at.desc())
    )
    res = await db.execute(stmt)
    apps = res.scalars().all()

    def app_priority(a):
        c_status = a.contract.status if a.contract else ""
        j_status = a.job.status if a.job else ""
        if c_status == "completed" or j_status == "completed":
            return 5
        if c_status in ("funded", "in_progress") or a.status in ("funded", "in_progress"):
            return 4
        if c_status == "disputed" or j_status == "disputed":
            return 3
        if a.status in ("awaiting_decision", "negotiating", "approved"):
            return 2
        return 1

    sorted_apps = sorted(apps, key=app_priority, reverse=True)
    out = []
    seen_jobs = set()

    for a in sorted_apps:
        if a.job_id in seen_jobs:
            continue
        seen_jobs.add(a.job_id)

        effective_status = a.status
        c_status = a.contract.status if a.contract else None
        j_status = a.job.status if a.job else None

        if c_status == "completed" or j_status == "completed":
            effective_status = "completed"
        elif a.contract and a.contract.milestones and all(m.status in ("paid", "passed") for m in a.contract.milestones):
            effective_status = "completed"
        elif c_status == "disputed" or j_status == "disputed":
            effective_status = "disputed"
        elif c_status in ("funded", "in_progress") or j_status in ("funded", "in_progress"):
            effective_status = "funded"

        out.append({
            "id": a.id,
            "job_id": a.job_id,
            "job_title": a.job.title if a.job else "Untitled Job",
            "client_name": "Northwind Studio" if a.job and "northwind" in (a.job.client_id or "").lower() else "Maya Patel",
            "freelancer_id": a.freelancer_id,
            "freelancer_name": a.freelancer_name,
            "min_price": a.min_price,
            "preferred_price": a.preferred_price,
            "time_needed_days": a.time_needed_days,
            "skills": a.skills,
            "status": effective_status,
            "client_accepted": a.client_accepted,
            "freelancer_accepted": a.freelancer_accepted,
            "counters_used": a.counters_used,
            "contract_amount": a.contract.total_amount if a.contract else None,
            "contract_status": c_status or effective_status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })
    return out


@router.get("/api/freelancer/contracts", response_model=List[dict])
async def list_freelancer_contracts(
    current_user: TokenUser = Depends(require_freelancer),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists funded contracts where the authenticated freelancer is the worker.
    """
    stmt = (
        select(Contract)
        .join(Application, Contract.application_id == Application.id)
        .where(
            Application.freelancer_id == current_user.user_id,
            Contract.status.in_(["funded", "in_progress", "active", "completed", "disputed"])
        )
        .options(
            selectinload(Contract.job),
            selectinload(Contract.milestones).selectinload(Milestone.acceptance_criteria),
            selectinload(Contract.milestones).selectinload(Milestone.submissions),
        )
        .order_by(Contract.created_at.desc())
    )
    res = await db.execute(stmt)
    contracts = res.scalars().all()

    out = []
    for c in contracts:
        out.append({
            "id": c.id,
            "job_id": c.job_id,
            "job_title": c.job.title if c.job else "",
            "total_amount": c.total_amount,
            "currency": c.currency,
            "deadline": c.deadline,
            "status": c.status,
            "milestones_count": len(c.milestones),
            "completed_milestones": sum(1 for m in c.milestones if m.status in ["passed", "paid"]),
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    return out


@router.get("/api/freelancer/earnings", response_model=List[dict])
async def list_freelancer_earnings(
    current_user: TokenUser = Depends(require_freelancer),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists payment capture entries from the ledger for this freelancer.
    """
    app_stmt = (
        select(Application.id, Contract.id)
        .join(Contract, Contract.application_id == Application.id)
        .where(Application.freelancer_id == current_user.user_id)
    )
    app_res = await db.execute(app_stmt)
    contract_ids = [row[1] for row in app_res.all() if row[1]]

    if not contract_ids:
        return []

    stmt = (
        select(PaymentLedgerEntry)
        .where(
            PaymentLedgerEntry.contract_id.in_(contract_ids),
            PaymentLedgerEntry.type == "captured",
        )
        .order_by(PaymentLedgerEntry.created_at.desc())
    )
    res = await db.execute(stmt)
    entries = res.scalars().all()

    return [
        {
            "id": e.id,
            "job_id": e.job_id,
            "contract_id": e.contract_id,
            "milestone_id": e.milestone_id,
            "amount": e.amount,
            "currency": e.currency,
            "paypal_capture_id": e.paypal_id,
            "note": e.note,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]


@router.get("/api/freelancer/stats", response_model=dict)
async def get_freelancer_statistics(
    current_user: TokenUser = Depends(require_freelancer),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns earnings and pending verification metrics from payments_ledger.
    """
    return await stats_service.get_freelancer_stats(db, current_user.user_id)


# =========================================================================
# BACKWARDS-COMPATIBLE FALLBACKS & SHARED CONTRACT VIEW
# =========================================================================

@router.get("/api/jobs", response_model=List[dict])
async def list_jobs_legacy(
    current_user: Optional[TokenUser] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    General list endpoint. Enforces privacy:
    If client, returns only their own jobs.
    If freelancer or unauthenticated, returns open opportunities without max_budget.
    """
    if current_user and current_user.role == "client":
        return await list_client_jobs(current_user=current_user, db=db)
    return await list_opportunities(current_user=current_user, db=db)


@router.get("/api/jobs/{job_id}", response_model=dict)
async def get_job_legacy(
    job_id: str,
    app_id: Optional[str] = Query(None),
    current_user: Optional[TokenUser] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves job. If caller is client owner, reveals max_budget; otherwise conceals it.
    """
    job = await load_job_with_relations(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    is_owner_client = current_user and current_user.role == "client" and current_user.user_id == job.client_id
    visible_max_budget = job.max_budget if is_owner_client else None

    # Resolve relevant contract:
    # - If caller is a freelancer: ONLY show contract if it belongs to their own application!
    # - If caller is client with app_id: ONLY show contract if it belongs to that specific application!
    # - Otherwise (client overview or public): show job's active/primary contract.
    target_contract = None
    cur_uid = normalize_uid(current_user.user_id) if current_user else ""
    if current_user and current_user.role == "freelancer":
        user_app = next((a for a in (job.applications or []) if normalize_uid(a.freelancer_id) == cur_uid), None)
        if user_app:
            if user_app.contract:
                target_contract = user_app.contract
            elif job.contracts:
                target_contract = next((c for c in job.contracts if c.application_id == user_app.id), None)
    elif is_owner_client:
        if app_id:
            target_app = next((a for a in (job.applications or []) if a.id == app_id), None)
            if target_app and target_app.contract:
                target_contract = target_app.contract
            elif job.contracts:
                target_contract = next((c for c in job.contracts if c.application_id == app_id), None)
        else:
            target_contract = job.active_contract or (job.contracts[0] if job.contracts else None)
    elif not current_user:
        if job.contracts:
            c = job.active_contract or job.contracts[0]
            if c.status in ("funded", "active", "completed"):
                target_contract = c

    await ensure_three_milestones(db, target_contract, job.deadline)
    contract_data = serialize_contract_model(target_contract)

    return {
        "id": job.id,
        "client_id": job.client_id,
        "title": job.title,
        "description": job.description,
        "deliverables": job.deliverables,
        "max_budget": visible_max_budget,
        "public_budget_estimate": job.public_budget_estimate or "Negotiable",
        "currency": job.currency,
        "deadline": job.deadline,
        "priorities": job.priorities,
        "must_haves": job.must_haves,
        "status": job.status,
        "client_approved": job.client_approved,
        "freelancer_approved": job.freelancer_approved,
        "is_demo": bool(getattr(job, "is_demo", False)),
        "paypal_order_id": job.paypal_order_id,
        "paypal_authorization_id": job.paypal_authorization_id,
        "paypal_status": job.paypal_status,
        "authorization_expires_at": job.authorization_expires_at,
        "contract": contract_data,
        "applications": [
            {
                "id": a.id,
                "freelancer_id": a.freelancer_id,
                "freelancer_name": (
                    "Sofia Reyes"
                    if "sofia" in (a.freelancer_id or "").lower()
                    else "Arjun Kumar"
                    if not a.freelancer_name or a.freelancer_name in ("Senior Full-Stack Engineer", "Alex (Verified)", "Freelancer Agent")
                    else a.freelancer_name
                ),
                "freelancer_title": "Backend & Data Pipeline Specialist" if "sofia" in (a.freelancer_id or "").lower() else "Full-Stack & Systems Engineer",
                "preferred_price": a.preferred_price,
                "min_price": a.min_price if (current_user and current_user.role == "freelancer" and normalize_uid(a.freelancer_id) == cur_uid) else None,
                "time_needed_days": a.time_needed_days,
                "skills": a.skills,
                "exclusions": a.exclusions,
                "notes": a.notes,
                "status": a.status,
                "client_accepted": a.client_accepted,
                "freelancer_accepted": a.freelancer_accepted,
                "counters_used": a.counters_used,
                "contract": serialize_contract_model(a.contract or next((c for c in (job.contracts or []) if c.application_id == a.id), None)),
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "negotiation_turns": [
                    {
                        "id": t.id,
                        "application_id": t.application_id,
                        "round_number": t.round_number,
                        "agent_role": t.agent_role or ("client" if t.sender == "client_agent" else "freelancer"),
                        "sender": t.sender or f"{t.agent_role}_agent",
                        "message": t.message,
                        "proposal_summary": t.proposal_summary,
                        "proposed_price": t.proposed_price,
                        "price_change_reason": t.price_change_reason,
                        "agreed": bool(t.agreed),
                        "created_at": t.timestamp.isoformat() if t.timestamp else None,
                    }
                    for t in sorted(a.negotiation_turns or [], key=lambda x: (x.round_number, x.timestamp.isoformat() if x.timestamp else ""))
                ],
            }
            for a in (job.applications or [])
            if is_owner_client or (current_user and current_user.role == "freelancer" and normalize_uid(a.freelancer_id) == cur_uid)
        ],
        "my_application": next(
            (
                {
                    "id": a.id,
                    "freelancer_id": a.freelancer_id,
                    "freelancer_name": (
                        "Sofia Reyes"
                        if "sofia" in (a.freelancer_id or "").lower()
                        else "Arjun Kumar"
                        if not a.freelancer_name or a.freelancer_name in ("Senior Full-Stack Engineer", "Alex (Verified)", "Freelancer Agent")
                        else a.freelancer_name
                    ),
                    "freelancer_title": "Backend & Data Pipeline Specialist" if "sofia" in (a.freelancer_id or "").lower() else "Full-Stack & Systems Engineer",
                    "preferred_price": a.preferred_price,
                    "min_price": a.min_price,
                    "time_needed_days": a.time_needed_days,
                    "skills": a.skills,
                    "exclusions": a.exclusions,
                    "notes": a.notes,
                    "status": a.status,
                    "client_accepted": a.client_accepted,
                    "freelancer_accepted": a.freelancer_accepted,
                    "counters_used": a.counters_used,
                    "contract": serialize_contract_model(a.contract or next((c for c in (job.contracts or []) if c.application_id == a.id), None)),
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                    "negotiation_turns": [
                        {
                            "id": t.id,
                            "application_id": t.application_id,
                            "round_number": t.round_number,
                            "agent_role": t.agent_role or ("client" if t.sender == "client_agent" else "freelancer"),
                            "sender": t.sender or f"{t.agent_role}_agent",
                            "message": t.message,
                            "proposal_summary": t.proposal_summary,
                            "proposed_price": t.proposed_price,
                            "price_change_reason": t.price_change_reason,
                            "agreed": bool(t.agreed),
                            "created_at": t.timestamp.isoformat() if t.timestamp else None,
                        }
                        for t in sorted(a.negotiation_turns or [], key=lambda x: (x.round_number, x.timestamp.isoformat() if x.timestamp else ""))
                    ],
                }
                for a in (job.applications or [])
                if current_user and current_user.role == "freelancer" and normalize_uid(a.freelancer_id) == cur_uid
            ),
            None
        ),
        "audit_logs": [
            {
                "id": log.id,
                "event_type": log.event_type,
                "actor": log.actor,
                "details": log.details,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            }
            for log in job.audit_logs
        ],
        "negotiation_turns": [
            {
                "id": t.id,
                "application_id": t.application_id,
                "round_number": t.round_number,
                "agent_role": t.agent_role or ("client" if t.sender == "client_agent" else "freelancer"),
                "sender": t.sender or f"{t.agent_role}_agent",
                "message": t.message,
                "proposal_summary": t.proposal_summary,
                "proposed_price": t.proposed_price,
                "price_change_reason": t.price_change_reason,
                "agreed": bool(t.agreed),
                "created_at": t.timestamp.isoformat() if t.timestamp else None,
            }
            for t in sorted(
                (
                    # Freelancer: ONLY their own application's turns
                    [turn for a in (job.applications or []) if current_user and current_user.role == "freelancer" and normalize_uid(a.freelancer_id) == cur_uid for turn in (a.negotiation_turns or [])]
                    if current_user and current_user.role == "freelancer" and any(normalize_uid(a.freelancer_id) == cur_uid for a in (job.applications or []))
                    # Client with specific app_id
                    else [turn for a in (job.applications or []) if a.id == app_id for turn in (a.negotiation_turns or [])]
                    if app_id and any(a.id == app_id for a in (job.applications or []))
                    # Client without specific app_id: pick active or latest application's turns
                    else (
                        next((a.negotiation_turns for a in (job.applications or []) if a.status in ("negotiating", "approved", "funded") and a.negotiation_turns), None)
                        or (job.applications[-1].negotiation_turns if (job.applications and job.applications[-1].negotiation_turns) else None)
                        or (job.negotiation_turns or [])
                    )
                ),
                key=lambda x: (x.round_number, x.timestamp.isoformat() if x.timestamp else "")
            )
        ],
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }


@router.get("/api/contracts/{contract_id}", response_model=dict)
async def get_contract(
    contract_id: str,
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Shared contract view for client and freelancer.
    Verifies that the caller is either the client owner or the freelancer applicant.
    """
    stmt = (
        select(Contract)
        .where(Contract.id == contract_id)
        .options(
            selectinload(Contract.job),
            selectinload(Contract.application),
            selectinload(Contract.milestones).selectinload(Milestone.acceptance_criteria),
            selectinload(Contract.milestones).selectinload(Milestone.submissions).selectinload(DeliverableSubmission.evaluations),
            selectinload(Contract.milestones).selectinload(Milestone.disputes),
        )
    )
    res = await db.execute(stmt)
    contract = res.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    is_client = current_user.role == "client" and current_user.user_id == contract.job.client_id
    is_freelancer = current_user.role == "freelancer" and contract.application and current_user.user_id == contract.application.freelancer_id

    if not is_client and not is_freelancer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are neither the client owner nor the contracted freelancer.",
        )

    return {
        "id": contract.id,
        "job_id": contract.job_id,
        "job_title": contract.job.title if contract.job else "",
        "application_id": contract.application_id,
        "total_amount": contract.total_amount,
        "currency": contract.currency,
        "deadline": contract.deadline,
        "status": contract.status,
        "paypal_order_id": contract.paypal_order_id or contract.job.paypal_order_id,
        "paypal_authorization_id": contract.paypal_authorization_id or contract.job.paypal_authorization_id,
        "authorized_at": contract.authorized_at.isoformat() if contract.authorized_at else None,
        "expires_at": contract.expires_at.isoformat() if contract.expires_at else contract.job.authorization_expires_at,
        "milestones": [
            {
                "id": m.id,
                "order_index": m.order_index,
                "title": m.title,
                "description": m.description,
                "amount": m.amount,
                "due_date": m.due_date,
                "status": m.status,
                "captured_amount": m.captured_amount,
                "paid_amount": m.paid_amount,
                "score": m.score,
                "paypal_capture_id": m.paypal_capture_id,
                "resubmission_count": m.resubmissions_used,
                "acceptance_criteria": [
                    {"id": ac.criterion_key, "text": ac.text, "weight": ac.weight}
                    for ac in m.acceptance_criteria
                ],
                "submissions": [
                    {
                        "id": s.id,
                        "version": s.version,
                        "submission_type": s.submission_type,
                        "deliverable_type": s.deliverable_type,
                        "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
                        "evaluations": [
                            {
                                "id": ev.id,
                                "overall_score": ev.overall_score,
                                "verdict": ev.verdict,
                                "feedback_for_freelancer": ev.feedback_for_freelancer,
                                "per_criterion_results": ev.per_criterion_results,
                                "sandbox_evidence": ev.sandbox_evidence,
                                "evaluated_at": ev.evaluated_at.isoformat() if ev.evaluated_at else None,
                            }
                            for ev in s.evaluations
                        ],
                    }
                    for s in m.submissions
                ],
                "disputes": [
                    {
                        "id": d.id,
                        "raised_by": d.raised_by,
                        "reason": d.reason,
                        "status": d.status,
                        "ruling": d.ruling,
                        "amount_to_capture": d.amount_to_capture,
                        "amount_to_refund": d.amount_to_refund,
                        "reasoning": d.reasoning,
                        "created_at": d.created_at.isoformat() if d.created_at else None,
                    }
                    for d in m.disputes
                ],
            }
            for m in contract.milestones
        ],
        "created_at": contract.created_at.isoformat() if contract.created_at else None,
    }


# =========================================================================
# JOB-LEVEL WORKFLOW CONVENIENCE ALIASES (Negotiate, Approve, Fund, Authorize)
# =========================================================================

@router.post("/api/jobs/{job_id}/negotiate", response_model=dict)
async def step_job_negotiation(
    job_id: str,
    run_all: bool = False,
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Convenience alias resolving job's active application and advancing agent negotiation."""
    from backend.api.applications import step_application_negotiation
    stmt = (
        select(Application)
        .where(Application.job_id == job_id)
        .order_by(Application.created_at.desc())
    )
    res = await db.execute(stmt)
    apps = res.scalars().all()
    if not apps:
        raise HTTPException(status_code=404, detail="No application found for this job yet. A freelancer must apply first.")

    target_app = None
    if current_user.role == "freelancer":
        for a in apps:
            if a.freelancer_id == current_user.user_id:
                target_app = a
                break
    if not target_app:
        for a in apps:
            if a.status in ("negotiating", "awaiting_decision", "awaiting_approval"):
                target_app = a
                break
    if not target_app:
        target_app = apps[0]

    return await step_application_negotiation(
        app_id=target_app.id,
        run_all=run_all,
        current_user=current_user,
        db=db,
    )


@router.post("/api/jobs/{job_id}/approve", response_model=dict)
async def approve_job_contract(
    job_id: str,
    req: ApprovalRequest,
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approves draft contract for job's active application."""
    from backend.api.applications import human_decision
    from backend.schemas.schemas import HumanDecisionRequest

    stmt = (
        select(Application)
        .where(Application.job_id == job_id)
        .order_by(Application.created_at.desc())
    )
    res = await db.execute(stmt)
    apps = res.scalars().all()
    if not apps:
        raise HTTPException(status_code=404, detail="No application found for this job.")

    target_app = None
    if current_user.role == "freelancer":
        for a in apps:
            if a.freelancer_id == current_user.user_id:
                target_app = a
                break
    if not target_app:
        for a in apps:
            if a.status in ("awaiting_decision", "awaiting_approval", "negotiating", "approved"):
                target_app = a
                break
    if not target_app:
        target_app = apps[0]

    decide_req = HumanDecisionRequest(role=req.role, action="accept")
    return await human_decision(
        app_id=target_app.id,
        req=decide_req,
        current_user=current_user,
        db=db,
    )


@router.post("/api/jobs/{job_id}/fund", response_model=dict)
async def fund_job_escrow(
    job_id: str,
    current_user: TokenUser = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Creates PayPal Order for job's approved contract."""
    from backend.api.applications import create_funding_order

    stmt = (
        select(Application)
        .where(Application.job_id == job_id)
        .order_by(Application.created_at.desc())
    )
    res = await db.execute(stmt)
    apps = res.scalars().all()
    if not apps:
        raise HTTPException(status_code=404, detail="No application found for this job.")

    job_stmt = select(Job).where(Job.id == job_id)
    job_res = await db.execute(job_stmt)
    job = job_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    target_app = None
    # 1. Prefer application corresponding to job's active_contract_id
    if job.active_contract_id:
        contract_stmt = select(Contract).where(Contract.id == job.active_contract_id)
        c_res = await db.execute(contract_stmt)
        c = c_res.scalar_one_or_none()
        if c and c.application_id:
            for a in apps:
                if a.id == c.application_id:
                    target_app = a
                    break

    # 2. Otherwise find an approved or funding application
    if not target_app:
        for a in apps:
            if a.status in ("approved", "funding", "funded"):
                target_app = a
                break
    if not target_app:
        target_app = apps[0]

    return await create_funding_order(
        app_id=target_app.id,
        payment_source="paypal_wallet",
        current_user=current_user,
        db=db,
    )


@router.post("/api/jobs/{job_id}/authorize", response_model=dict)
async def authorize_job_payment(
    job_id: str,
    body: Optional[dict] = Body(default=None),
    current_user: TokenUser = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """Authorizes PayPal payment for job's approved application."""
    from backend.api.applications import authorize_funding_order

    stmt = (
        select(Application)
        .where(Application.job_id == job_id)
        .order_by(Application.created_at.desc())
    )
    res = await db.execute(stmt)
    apps = res.scalars().all()
    if not apps:
        raise HTTPException(status_code=404, detail="No application found for this job.")

    job_stmt = select(Job).where(Job.id == job_id)
    job_res = await db.execute(job_stmt)
    job = job_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    target_app = None
    # 1. Prefer application corresponding to job's active_contract_id
    if job.active_contract_id:
        contract_stmt = select(Contract).where(Contract.id == job.active_contract_id)
        c_res = await db.execute(contract_stmt)
        c = c_res.scalar_one_or_none()
        if c and c.application_id:
            for a in apps:
                if a.id == c.application_id:
                    target_app = a
                    break

    # 2. Otherwise find an approved or funding application
    if not target_app:
        for a in apps:
            if a.status in ("approved", "funding", "funded"):
                target_app = a
                break
    if not target_app:
        target_app = apps[0]

    return await authorize_funding_order(
        app_id=target_app.id,
        body=body,
        current_user=current_user,
        db=db,
    )


@router.post("/api/jobs/{job_id}/close", response_model=dict)
async def close_job_listing(
    job_id: str,
    current_user: TokenUser = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Allows the client owner to explicitly close an open project listing.
    """
    stmt = (
        select(Job)
        .where(Job.id == job_id)
        .options(selectinload(Job.applications))
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if job.client_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the client owner can close this project.")

    if job.status in ("funded", "in_progress", "completed"):
        raise HTTPException(
            status_code=400,
            detail="Cannot close a project with active or settled escrow funds.",
        )

    job.status = "closed"
    for app in (job.applications or []):
        if app.status in ("pending", "negotiating", "applied", "no_deal"):
            app.status = "closed"

    await add_audit_log(
        db,
        job.id,
        "JOB_CLOSED_BY_CLIENT",
        "client",
        {"client_id": current_user.user_id, "previous_status": job.status},
    )
    await db.commit()
    return {"id": job.id, "status": "closed", "message": "Project listing successfully closed."}


@router.post("/api/jobs/{job_id}/revise-budget", response_model=dict)
async def revise_job_budget(
    job_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: TokenUser = Depends(require_client),
    db: AsyncSession = Depends(get_db),
):
    """
    Allows the client owner to revise the budget cap and public range.
    Re-evaluates previously non-matching candidate proposals and re-opens negotiation if they now fit!
    """
    stmt = (
        select(Job)
        .where(Job.id == job_id)
        .options(
            selectinload(Job.applications),
            selectinload(Job.negotiation_turns),
        )
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if job.client_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the job owner can revise the budget.")

    if job.status in ("funded", "in_progress", "completed"):
        raise HTTPException(status_code=400, detail="Cannot revise budget of an active or settled escrow contract.")

    new_budget = float(payload.get("new_max_budget", 0))
    if new_budget <= 0:
        raise HTTPException(status_code=400, detail="New budget must be greater than zero.")

    new_estimate = payload.get("new_public_estimate")
    if not new_estimate:
        min_est = round(new_budget * 0.6)
        new_estimate = f"${min_est:.2f} – ${new_budget:.2f} USD"

    old_budget = job.max_budget
    job.max_budget = new_budget
    job.public_budget_estimate = new_estimate

    reopened_count = 0
    for app in (job.applications or []):
        if app.status == "no_deal":
            # If freelancer min price is now within or equal to new budget, re-open negotiation!
            if app.min_price <= new_budget:
                app.status = "negotiating"
                reopened_count += 1
                turn = NegotiationTurn(
                    job_id=job.id,
                    application_id=app.id,
                    round_number=len(job.negotiation_turns or []) + 1,
                    agent_role="client",
                    sender="client_agent",
                    message=(
                        f"Client has revised their budget cap from ${old_budget:.2f} to ${new_budget:.2f} USD. "
                        f"Your quote (${app.preferred_price:.2f} USD) is now within acceptable parameters. Negotiating milestone schedule."
                    ),
                    proposal_summary=f"Client increased budget to ${new_budget:.2f} USD.",
                    proposed_price=min(new_budget, app.preferred_price),
                    price_change_reason="Client budget revision.",
                    agreed=False,
                )
                db.add(turn)

    if reopened_count > 0:
        job.status = "in_negotiation"
    elif job.status == "closed":
        job.status = "open"

    await add_audit_log(
        db,
        job.id,
        "JOB_BUDGET_REVISED",
        "client",
        {
            "old_budget": old_budget,
            "new_budget": new_budget,
            "new_estimate": new_estimate,
            "reopened_candidates": reopened_count,
        },
    )
    await db.commit()

    return {
        "id": job.id,
        "max_budget": job.max_budget,
        "public_budget_estimate": job.public_budget_estimate,
        "status": job.status,
        "reopened_count": reopened_count,
        "message": f"Budget successfully revised to ${new_budget:.2f} USD. {reopened_count} candidate proposal(s) re-opened for negotiation.",
    }

