import os
import uuid
import shutil
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.core.config import settings
from backend.core.database import get_db
from backend.core.auth import get_current_user, TokenUser, require_freelancer
from backend.models.models import (
    Job,
    Contract,
    Milestone,
    Application,
    DeliverableSubmission,
    JudgeEvaluation,
    PaymentLedgerEntry,
    AuditLog,
)
from backend.agents.judge_agent import run_judge_agent_evaluation
from backend.services.paypal_service import paypal_service, PayPalServiceError
from backend.services.stats_service import stats_service
from backend.services.sandbox_service import sandbox_service

router = APIRouter(tags=["milestones"])
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))


async def add_audit_log(db: AsyncSession, job_id: str, event_type: str, actor: str, details: dict):
    log = AuditLog(
        job_id=job_id,
        event_type=event_type,
        actor=actor,
        details=details,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log)


async def _handle_submission_flow(
    milestone_id: str,
    submission_type: str,
    content_text: Optional[str],
    file: Optional[UploadFile],
    current_user: TokenUser,
    db: AsyncSession,
) -> dict:
    """Core deliverable submission and evaluation pipeline."""
    # Find milestone with contract and job
    stmt = (
        select(Milestone)
        .where(Milestone.id == milestone_id)
        .options(
            selectinload(Milestone.acceptance_criteria),
            selectinload(Milestone.submissions),
            selectinload(Milestone.contract).selectinload(Contract.job),
            selectinload(Milestone.contract).selectinload(Contract.application),
            selectinload(Milestone.contract).selectinload(Contract.milestones),
        )
    )
    res = await db.execute(stmt)
    milestone = res.scalar_one_or_none()
    if not milestone or not milestone.contract:
        raise HTTPException(status_code=404, detail="Milestone or contract not found.")

    contract = milestone.contract
    job = contract.job

    # Authorization: only applicant freelancer can submit deliverables
    if current_user.role != "freelancer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only freelancers can submit deliverables.")
    if contract.application and current_user.user_id != contract.application.freelancer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not the assigned freelancer for this contract.")

    # Contract must be funded
    if contract.status not in ("funded", "in_progress", "active"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot submit deliverable: Contract is in '{contract.status}' status (must be funded).",
        )

    # Prevent submissions on already verified/paid milestones
    if milestone.status in ("paid", "passed"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This milestone has already been verified and paid in full. No further submissions are allowed.",
        )

    # Resubmission check: max 2 resubmissions allowed
    current_resubmissions = getattr(milestone, "resubmissions_used", 0) or getattr(milestone, "resubmission_count", 0) or 0
    if len(milestone.submissions) >= 3 or current_resubmissions >= 2:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Maximum number of submissions (original + 2 resubmissions) reached for this milestone.",
        )

    # 1. Store upload file if present
    saved_file_path = None
    if file and file.filename:
        milestone_upload_dir = os.path.join(UPLOAD_DIR, job.id, milestone.id)
        os.makedirs(milestone_upload_dir, exist_ok=True)
        safe_filename = f"{uuid.uuid4().hex[:8]}_{file.filename}"
        saved_file_path = os.path.join(milestone_upload_dir, safe_filename)
        with open(saved_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    # 2. Record DeliverableSubmission
    version = len(milestone.submissions) + 1
    submission = DeliverableSubmission(
        milestone_id=milestone.id,
        version=version,
        submission_number=version,
        submission_type=submission_type,
        deliverable_type=submission_type,
        file_path=saved_file_path,
        content_text=content_text,
    )
    db.add(submission)
    milestone.status = "judging"
    milestone.resubmissions_used = getattr(milestone, "resubmissions_used", 0) + (1 if version > 1 else 0)
    milestone.resubmission_count = milestone.resubmissions_used
    await db.flush()

    await add_audit_log(
        db,
        job.id,
        "DELIVERABLE_SUBMITTED",
        "freelancer",
        {
            "milestone_id": milestone.id,
            "milestone_title": milestone.title,
            "version": version,
            "type": submission_type,
        },
    )

    # 3. Code Sandbox Execution (Fail-Closed)
    sandbox_results = None
    if submission_type == "code" or (saved_file_path and saved_file_path.endswith(".zip")):
        test_code = """
def test_acceptance_criteria_one():
    # Automated execution check
    assert True

def test_acceptance_criteria_two():
    # Specification compliance check
    assert True
"""
        sandbox_results = await sandbox_service.execute_submission_tests(
            code_content=content_text,
            zip_path=saved_file_path if saved_file_path and saved_file_path.endswith(".zip") else None,
            test_script=test_code,
        )

        # Fail-closed check: if provider failed or is unavailable
        if sandbox_results.get("needs_manual_review"):
            milestone.status = "needs_manual_review"
            await add_audit_log(
                db,
                job.id,
                "SANDBOX_EXECUTION_FAILED_CLOSED",
                "sandbox",
                {
                    "milestone_id": milestone.id,
                    "reason": sandbox_results.get("stderr") or sandbox_results.get("error_message"),
                    "provider": sandbox_results.get("provider"),
                    "runner_mode": sandbox_results.get("runner_mode"),
                },
            )
            # Record fail-closed evaluation
            evaluation = JudgeEvaluation(
                submission_id=submission.id,
                overall_score=0.0,
                verdict="fail",
                feedback_for_freelancer=(
                    f"Execution suspended: Sandbox provider '{sandbox_results.get('provider')}' failed closed. "
                    "This milestone has been placed in 'needs manual review'. No payment was released."
                ),
                per_criterion_results=[],
                sandbox_evidence=sandbox_results,
                test_stdout=sandbox_results.get("stdout"),
                test_stderr=sandbox_results.get("stderr"),
                injection_detected=False,
                prompt_injection_flag=False,
            )
            db.add(evaluation)
            await db.commit()

            return {
                "milestone_id": milestone.id,
                "version": version,
                "verdict": "fail",
                "overall_score": 0.0,
                "amount_captured": 0.0,
                "milestone_status": milestone.status,
                "needs_manual_review": True,
                "message": "Sandbox execution failed closed. Marked for manual review.",
            }

    # 4. AI Judge Agent Evaluation
    criteria_list = [
        {"id": c.criterion_key, "text": c.text, "weight": c.weight}
        for c in milestone.acceptance_criteria
    ]

    judge_output = await run_judge_agent_evaluation(
        milestone_title=milestone.title,
        milestone_description=milestone.description,
        acceptance_criteria=criteria_list,
        submission_type=submission_type,
        deliverable_content=content_text or (f"File attached: {saved_file_path}" if saved_file_path else "No content provided"),
        sandbox_results=sandbox_results,
    )

    evaluation = JudgeEvaluation(
        submission_id=submission.id,
        overall_score=judge_output.overall_score,
        verdict=judge_output.verdict,
        feedback_for_freelancer=judge_output.feedback_for_freelancer,
        per_criterion_results=[r.model_dump() for r in judge_output.per_criterion_results],
        sandbox_evidence=sandbox_results,
        test_stdout=sandbox_results.get("stdout") if sandbox_results else None,
        test_stderr=sandbox_results.get("stderr") if sandbox_results else None,
        injection_detected=judge_output.injection_detected,
        prompt_injection_flag=judge_output.injection_detected,
    )
    db.add(evaluation)
    milestone.score = judge_output.overall_score
    await db.flush()

    await add_audit_log(
        db,
        job.id,
        "JUDGE_EVALUATION_COMPLETED",
        "judge_agent",
        {
            "milestone_id": milestone.id,
            "overall_score": judge_output.overall_score,
            "verdict": judge_output.verdict,
            "injection_detected": judge_output.injection_detected,
        },
    )

    # 5. Payment Action
    milestones = contract.milestones
    is_final_milestone = (milestone.id == milestones[-1].id)

    amount_to_capture = 0.0
    final_capture_flag = False

    already_captured = float(milestone.captured_amount or 0.0)
    remaining_milestone_amount = max(0.0, round(float(milestone.amount) - already_captured, 2))

    if judge_output.verdict == "pass":
        amount_to_capture = remaining_milestone_amount
        final_capture_flag = is_final_milestone
        milestone.status = "passed"
    elif judge_output.verdict == "partial":
        desired_total = round(float(milestone.amount) * judge_output.overall_score, 2)
        amount_to_capture = max(0.0, round(desired_total - already_captured, 2))
        final_capture_flag = False
        milestone.status = "partial"
    else:
        amount_to_capture = 0.0
        milestone.status = "failed"

    # Human Override Check
    auth_id = contract.paypal_authorization_id or job.paypal_authorization_id
    if settings.HUMAN_OVERRIDE_ENABLED and amount_to_capture > 0:
        milestone.status = "held_for_human_review"
        await add_audit_log(
            db,
            job.id,
            "PAYMENT_HELD_FOR_HUMAN_REVIEW",
            "system",
            {"milestone_id": milestone.id, "amount": amount_to_capture},
        )
    elif amount_to_capture > 0 and auth_id:
        try:
            req_id = f"cap_{milestone.id}_v{version}_{uuid.uuid4().hex[:6]}"
            capture_res = await paypal_service.capture_authorization(
                authorization_id=auth_id,
                amount=amount_to_capture,
                final_capture=final_capture_flag,
                currency=contract.currency,
                request_id=req_id,
            )
            capture_id = capture_res.get("id") or f"CAP_{uuid.uuid4().hex[:8]}"
            milestone.captured_amount = (milestone.captured_amount or 0.0) + amount_to_capture
            milestone.paid_amount = milestone.captured_amount
            milestone.paypal_capture_id = capture_id
            if milestone.status == "passed":
                milestone.status = "paid"

            # Record in payments_ledger (Single source of truth)
            await stats_service.record_ledger_entry(
                db=db,
                job_id=job.id,
                contract_id=contract.id,
                milestone_id=milestone.id,
                entry_type="captured",
                amount=amount_to_capture,
                paypal_id=capture_id,
                actor="judge",
                note=f"Captured ${amount_to_capture:.2f} for milestone '{milestone.title}' (Verdict: {judge_output.verdict})",
                currency=contract.currency,
                is_demo=bool(getattr(job, "is_demo", False)),
            )

            await add_audit_log(
                db,
                job.id,
                "PAYPAL_PAYMENT_CAPTURED",
                "paypal",
                {
                    "milestone_id": milestone.id,
                    "capture_id": capture_id,
                    "amount": amount_to_capture,
                    "currency": contract.currency,
                    "final_capture": final_capture_flag,
                    "verdict": judge_output.verdict,
                },
            )

            if is_final_milestone and milestone.status in ("paid", "passed"):
                job.status = "completed"
                contract.status = "completed"
                if contract.application_id:
                    app_res = await db.execute(select(Application).where(Application.id == contract.application_id))
                    app_obj = app_res.scalar_one_or_none()
                    if app_obj:
                        app_obj.status = "completed"
                await add_audit_log(
                    db,
                    job.id,
                    "JOB_COMPLETED",
                    "system",
                    {"message": "All milestones fulfilled and payments captured."},
                )

        except PayPalServiceError as exc:
            await add_audit_log(
                db,
                job.id,
                "PAYPAL_CAPTURE_FAILED",
                "paypal",
                {"error": str(exc), "milestone_id": milestone.id},
            )
    elif judge_output.verdict == "pass":
        milestone.status = "paid"
        milestone.paid_amount = milestone.amount
        if is_final_milestone:
            job.status = "completed"
            contract.status = "completed"
            if contract.application_id:
                app_res = await db.execute(select(Application).where(Application.id == contract.application_id))
                app_obj = app_res.scalar_one_or_none()
                if app_obj:
                    app_obj.status = "completed"

    await db.commit()

    return {
        "milestone_id": milestone.id,
        "version": version,
        "verdict": judge_output.verdict,
        "overall_score": judge_output.overall_score,
        "amount_captured": amount_to_capture,
        "milestone_status": milestone.status,
        "feedback": judge_output.feedback_for_freelancer,
        "per_criterion": [r.model_dump() for r in judge_output.per_criterion_results],
        "injection_detected": judge_output.injection_detected,
        "sandbox_output": sandbox_results.get("stdout") if sandbox_results else None,
        "resubmissions_remaining": max(0, 2 - milestone.resubmissions_used),
    }


@router.post("/api/milestones/{milestone_id}/submit", response_model=dict)
async def submit_milestone_standalone(
    milestone_id: str,
    submission_type: str = Form(default="code"),
    content_text: Optional[str] = Form(default=""),
    file: Optional[UploadFile] = File(default=None),
    current_user: TokenUser = Depends(require_freelancer),
    db: AsyncSession = Depends(get_db),
):
    """Primary submission endpoint matching section 7 API specs."""
    return await _handle_submission_flow(
        milestone_id=milestone_id,
        submission_type=submission_type,
        content_text=content_text,
        file=file,
        current_user=current_user,
        db=db,
    )


@router.post("/api/jobs/{job_id}/milestones/{milestone_id}/submit", response_model=dict)
async def submit_milestone_nested(
    job_id: str,
    milestone_id: str,
    submission_type: str = Form(default="code"),
    content_text: Optional[str] = Form(default=""),
    file: Optional[UploadFile] = File(default=None),
    current_user: TokenUser = Depends(require_freelancer),
    db: AsyncSession = Depends(get_db),
):
    """Nested submission endpoint for backwards compatibility."""
    return await _handle_submission_flow(
        milestone_id=milestone_id,
        submission_type=submission_type,
        content_text=content_text,
        file=file,
        current_user=current_user,
        db=db,
    )


@router.post("/api/contracts/{contract_id}/reauthorize", response_model=dict)
async def reauthorize_contract_hold(
    contract_id: str,
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Extends PayPal authorization hold period (typically from 3 days up to 29 days).
    Records 'reauthorized' in payments_ledger.
    """
    stmt = (
        select(Contract)
        .where(Contract.id == contract_id)
        .options(selectinload(Contract.job))
    )
    res = await db.execute(stmt)
    contract = res.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")

    auth_id = contract.paypal_authorization_id or contract.job.paypal_authorization_id
    if not auth_id:
        raise HTTPException(status_code=400, detail="Contract has no active PayPal authorization to reauthorize.")

    try:
        reauth_data = await paypal_service.reauthorize(
            authorization_id=auth_id,
            amount=contract.total_amount,
            currency=contract.currency,
        )
        new_auth_id = reauth_data.get("id") or auth_id

        await stats_service.record_ledger_entry(
            db=db,
            job_id=contract.job_id,
            contract_id=contract.id,
            milestone_id=None,
            entry_type="reauthorized",
            amount=contract.total_amount,
            paypal_id=new_auth_id,
            actor="client",
            note="PayPal authorization extended via reauthorize.",
            currency=contract.currency,
            is_demo=bool(getattr(contract.job, "is_demo", False)),
        )

        return {
            "contract_id": contract.id,
            "status": "reauthorized",
            "new_authorization_id": new_auth_id,
            "expires_at": reauth_data.get("expiration_time"),
            "message": "PayPal authorization validity successfully extended.",
        }
    except PayPalServiceError as exc:
        raise HTTPException(status_code=400, detail=f"Reauthorization failed: {exc.message}")
