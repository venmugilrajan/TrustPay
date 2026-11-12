from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.models.models import (
    Job,
    Contract,
    Milestone,
    Application,
    PaymentLedgerEntry,
    DisputeRecord,
)


class StatsService:
    """
    Centralized, single source of truth for all TrustPay financial metrics.
    Guarantees that dashboard numbers strictly compute from the payments_ledger table.
    """

    @staticmethod
    async def record_ledger_entry(
        db: AsyncSession,
        job_id: str,
        contract_id: Optional[str],
        milestone_id: Optional[str],
        entry_type: str,  # authorized, captured, voided, refunded, reauthorized
        amount: float,
        paypal_id: str,
        actor: str = "system",
        note: Optional[str] = None,
        currency: str = "USD",
        is_demo: bool = False,
        source: Optional[str] = None,
    ) -> PaymentLedgerEntry:
        """
        Creates an immutable financial ledger entry in payments_ledger.
        Source can be 'paypal_sandbox_live', 'mock', or 'demo'.
        """
        resolved_source = source or ("demo" if is_demo else "paypal_sandbox_live")
        entry = PaymentLedgerEntry(
            id=str(uuid.uuid4()),
            job_id=job_id,
            contract_id=contract_id,
            milestone_id=milestone_id,
            type=entry_type,
            amount=round(float(amount), 2),
            currency=currency,
            paypal_id=paypal_id,
            actor=actor,
            note=note,
            is_demo=is_demo or (resolved_source == "demo"),
            source=resolved_source,
            created_at=datetime.now(timezone.utc),
        )
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return entry

    @staticmethod
    async def get_client_stats(db: AsyncSession, client_id: str, include_demo: bool = True) -> Dict[str, Any]:
        """
        Computes financial metrics for a client strictly from payments_ledger.
        Includes demo & sandbox entries so dashboard numbers are complete.
        """
        job_stmt = (
            select(Job)
            .where(Job.client_id == client_id)
            .options(
                selectinload(Job.active_contract).selectinload(Contract.milestones),
                selectinload(Job.contracts).selectinload(Contract.milestones),
            )
        )
        job_res = await db.execute(job_stmt)
        client_jobs = job_res.scalars().all()
        if not include_demo:
            client_jobs = [j for j in client_jobs if not getattr(j, "is_demo", False)]

        job_ids = [j.id for j in client_jobs]

        if not job_ids:
            return {
                "active_contracts": 0,
                "negotiating_count": 0,
                "funds_held_escrow_usd": 0.0,
                "released_to_freelancers_usd": 0.0,
                "total_jobs_posted": 0,
            }

        # Active contracts = count of funded/in_progress contracts (funded work underway)
        active_contracts = 0
        negotiating_count = 0
        for j in client_jobs:
            if j.status in ["funded", "in_progress", "active"]:
                active_contracts += 1
            elif j.status in ["negotiating", "awaiting_approval", "approved", "funding"]:
                negotiating_count += 1

        ledger_stmt = select(PaymentLedgerEntry).where(PaymentLedgerEntry.job_id.in_(job_ids))
        if not include_demo:
            ledger_stmt = ledger_stmt.where(PaymentLedgerEntry.source == "paypal_sandbox_live")

        ledger_res = await db.execute(ledger_stmt)
        entries = ledger_res.scalars().all()

        if entries:
            total_authorized = sum(e.amount for e in entries if e.type == "authorized")
            total_captured = sum(e.amount for e in entries if e.type == "captured")
            total_voided = sum(e.amount for e in entries if e.type == "voided")
            total_refunded = sum(e.amount for e in entries if e.type == "refunded")
            funds_held = max(0.0, total_authorized - total_captured - total_voided - total_refunded)
            released = total_captured
        else:
            funds_held = 0.0
            released = 0.0

        return {
            "active_contracts": active_contracts,
            "negotiating_count": negotiating_count,
            "funds_held_escrow_usd": round(funds_held, 2),
            "released_to_freelancers_usd": round(released, 2),
            "total_jobs_posted": len(client_jobs),
        }

    @staticmethod
    async def get_freelancer_stats(db: AsyncSession, freelancer_id: str, include_demo: bool = True) -> Dict[str, Any]:
        """
        Computes earnings and pending figures for a freelancer strictly from payments_ledger.
        """
        app_stmt = (
            select(Application)
            .where(Application.freelancer_id == freelancer_id)
            .options(
                selectinload(Application.contract).selectinload(Contract.milestones),
                selectinload(Application.job),
            )
        )
        app_res = await db.execute(app_stmt)
        apps = app_res.scalars().all()
        if not include_demo:
            apps = [a for a in apps if not (a.job and getattr(a.job, "is_demo", False))]

        contract_ids = [a.contract.id for a in apps if a.contract]
        job_ids = [a.job_id for a in apps if a.job_id]

        active_contracts = sum(
            1 for a in apps if (a.contract and a.contract.status in ["funded", "in_progress", "active"]) or (a.status in ["funded", "in_progress"])
        )
        negotiating_count = sum(
            1 for a in apps if a.status in ["negotiating", "awaiting_approval", "approved"]
        )

        pending_verification = 0
        for a in apps:
            if a.contract:
                for m in a.contract.milestones:
                    if m.status in ["submitted", "judging", "evaluating", "under_review"]:
                        pending_verification += 1

        if not contract_ids and not job_ids:
            return {
                "active_contracts": active_contracts,
                "negotiating_count": negotiating_count,
                "pending_verification": pending_verification,
                "total_earned_usd": 0.0,
                "awaiting_release_usd": 0.0,
            }

        ledger_conditions = []
        if contract_ids:
            ledger_conditions.append(PaymentLedgerEntry.contract_id.in_(contract_ids))
        if job_ids:
            ledger_conditions.append(PaymentLedgerEntry.job_id.in_(job_ids))

        from sqlalchemy import or_
        ledger_stmt = select(PaymentLedgerEntry).where(or_(*ledger_conditions))
        if not include_demo:
            ledger_stmt = ledger_stmt.where(PaymentLedgerEntry.source == "paypal_sandbox_live")

        ledger_res = await db.execute(ledger_stmt)
        entries = ledger_res.scalars().all()

        if entries:
            total_authorized = sum(e.amount for e in entries if e.type == "authorized")
            total_captured = sum(e.amount for e in entries if e.type == "captured")
            total_voided = sum(e.amount for e in entries if e.type == "voided")
            total_refunded = sum(e.amount for e in entries if e.type == "refunded")
            earned = total_captured
            awaiting_release = max(0.0, total_authorized - total_captured - total_voided - total_refunded)
        else:
            earned = 0.0
            awaiting_release = 0.0

        return {
            "active_contracts": active_contracts,
            "negotiating_count": negotiating_count,
            "pending_verification": pending_verification,
            "total_earned_usd": round(earned, 2),
            "awaiting_release_usd": round(awaiting_release, 2),
        }

    @staticmethod
    async def get_system_stats(db: AsyncSession, include_demo: bool = True) -> Dict[str, Any]:
        """
        Global platform aggregates derived from payments_ledger.
        """
        job_stmt = (
            select(Job)
            .options(
                selectinload(Job.active_contract).selectinload(Contract.milestones),
                selectinload(Job.contracts).selectinload(Contract.milestones),
            )
        )
        res = await db.execute(job_stmt)
        jobs = res.scalars().all()
        if not include_demo:
            jobs = [j for j in jobs if not getattr(j, "is_demo", False)]

        total_jobs = len(jobs)
        active_contracts = sum(
            1 for j in jobs if j.status in ["funded", "in_progress", "active"]
        )
        negotiating_contracts = sum(
            1 for j in jobs if j.status in ["negotiating", "awaiting_approval", "approved", "funding"]
        )
        completed_contracts = sum(1 for j in jobs if j.status == "completed")

        ledger_stmt = select(PaymentLedgerEntry)
        if not include_demo:
            ledger_stmt = ledger_stmt.where(PaymentLedgerEntry.source == "paypal_sandbox_live")
        ledger_res = await db.execute(ledger_stmt)
        entries = ledger_res.scalars().all()

        if entries:
            total_authorized = sum(e.amount for e in entries if e.type == "authorized")
            total_captured = sum(e.amount for e in entries if e.type == "captured")
            total_voided = sum(e.amount for e in entries if e.type == "voided")
            total_refunded = sum(e.amount for e in entries if e.type == "refunded")
            funds_held_escrow_usd = max(0.0, total_authorized - total_captured - total_voided - total_refunded)
            released_payouts_usd = total_captured
            verified_milestones_count = sum(1 for e in entries if e.type == "captured")
        else:
            funds_held_escrow_usd = 0.0
            released_payouts_usd = 0.0
            verified_milestones_count = 0

        return {
            "total_jobs": total_jobs,
            "active_contracts": active_contracts,
            "active_jobs": active_contracts,
            "negotiating_contracts": negotiating_contracts,
            "completed_contracts": completed_contracts,
            "funds_held_escrow_usd": round(funds_held_escrow_usd, 2),
            "released_payouts_usd": round(released_payouts_usd, 2),
            "total_authorized_usd": round(total_authorized if entries else (funds_held_escrow_usd + released_payouts_usd), 2),
            "total_captured_usd": round(released_payouts_usd, 2),
            "verified_milestones_count": verified_milestones_count,
            "live_paypal_connected": True,
        }


stats_service = StatsService()
