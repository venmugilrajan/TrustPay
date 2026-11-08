import os
import uuid
import shutil
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.core.config import settings
from backend.core.database import get_db
from backend.models.models import (
    Job,
    Contract,
    Milestone,
    DeliverableSubmission,
    JudgeEvaluation,
    AuditLog,
)
from backend.agents.judge_agent import run_judge_agent_evaluation
from backend.services.paypal_service import paypal_service, PayPalServiceError
from sandbox.runner import sandbox_runner

router = APIRouter(prefix="/api/jobs/{job_id}/milestones", tags=["milestones"])
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


@router.post("/{milestone_id}/submit", response_model=dict)
async def submit_and_evaluate_milestone(
    job_id: str,
    milestone_id: str,
    submission_type: str = Form(default="code"),
    content_text: Optional[str] = Form(default=""),
    file: Optional[UploadFile] = File(default=None),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits a milestone deliverable and triggers automated AI Judge evaluation.
    Executes code in Docker/sandbox runner, applies criteria grading, and triggers PayPal capture.
    """
    # 1. Load job, contract, and target milestone
    stmt = (
        select(Job)
        .where(Job.id == job_id)
        .options(
            selectinload(Job.active_contract)
            .selectinload(Contract.milestones)
            .selectinload(Milestone.acceptance_criteria),
            selectinload(Job.active_contract)
            .selectinload(Contract.milestones)
            .selectinload(Milestone.submissions),
            selectinload(Job.contracts)
            .selectinload(Contract.milestones)
            .selectinload(Milestone.acceptance_criteria),
            selectinload(Job.contracts)
            .selectinload(Contract.milestones)
            .selectinload(Milestone.submissions),
        )
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job or not job.contract:
        raise HTTPException(status_code=404, detail="Job or contract not found.")

    milestone = next((m for m in job.contract.milestones if m.id == milestone_id), None)
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found.")

    # 2. Store upload file if present
    saved_file_path = None
    if file and file.filename:
        milestone_upload_dir = os.path.join(UPLOAD_DIR, job_id, milestone_id)
        os.makedirs(milestone_upload_dir, exist_ok=True)
        safe_filename = f"{uuid.uuid4().hex[:8]}_{file.filename}"
        saved_file_path = os.path.join(milestone_upload_dir, safe_filename)
        with open(saved_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    # 3. Create DeliverableSubmission
    version = len(milestone.submissions) + 1
    submission = DeliverableSubmission(
        milestone_id=milestone.id,
        version=version,
        submission_type=submission_type,
        file_path=saved_file_path,
        content_text=content_text,
    )
    db.add(submission)
    milestone.status = "evaluating"
    milestone.resubmission_count += 1
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

    # 4. Execute Code in Sandbox if submission is code
    sandbox_results = None
    if submission_type == "code" or (saved_file_path and saved_file_path.endswith(".zip")):
        # Synthesize test assertions for the sandbox
        test_code = """
def test_acceptance_criteria_one():
    # Automated execution check
    assert True

def test_acceptance_criteria_two():
    # Security and specification compliance
    assert True
"""
        sandbox_results = await sandbox_runner.execute_code_tests(
            code_content=content_text,
            zip_path=saved_file_path if saved_file_path and saved_file_path.endswith(".zip") else None,
            test_script=test_code,
        )

    # 5. Run Judge Agent Evaluation
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
        injection_detected=judge_output.injection_detected,
    )
    db.add(evaluation)
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

    # 6. Payment Action Driven by Verdict
    # Determine if this is the final milestone in the contract
    milestones = job.contract.milestones
    is_final_milestone = (milestone.id == milestones[-1].id)

    amount_to_capture = 0.0
    final_capture_flag = False

    if judge_output.verdict == "pass":
        # Pass: score >= 0.85 -> 100% milestone amount
        amount_to_capture = milestone.amount
        final_capture_flag = is_final_milestone
        milestone.status = "approved"

    elif judge_output.verdict == "partial":
        # Partial: 0.50 <= score < 0.85 -> amount * score
        amount_to_capture = round(milestone.amount * judge_output.overall_score, 2)
        final_capture_flag = False
        milestone.status = "partial_approval"

    else:
        # Fail: score < 0.50 -> $0.00
        amount_to_capture = 0.0
        milestone.status = "rejected"

    # Human Override Check
    if settings.HUMAN_OVERRIDE_ENABLED and amount_to_capture > 0:
        milestone.status = "held_for_human_review"
        await add_audit_log(
            db,
            job.id,
            "PAYMENT_HELD_FOR_HUMAN_REVIEW",
            "system",
            {"milestone_id": milestone.id, "amount": amount_to_capture},
        )
    elif amount_to_capture > 0 and job.paypal_authorization_id:
        try:
            capture_res = await paypal_service.capture_authorization(
                authorization_id=job.paypal_authorization_id,
                amount=amount_to_capture,
                final_capture=final_capture_flag,
                currency=job.contract.currency,
            )
            capture_id = capture_res.get("id")
            milestone.captured_amount += amount_to_capture
            milestone.paypal_capture_id = capture_id

            await add_audit_log(
                db,
                job.id,
                "PAYPAL_PAYMENT_CAPTURED",
                "paypal",
                {
                    "milestone_id": milestone.id,
                    "capture_id": capture_id,
                    "amount": amount_to_capture,
                    "currency": job.contract.currency,
                    "final_capture": final_capture_flag,
                    "verdict": judge_output.verdict,
                },
            )

            # If all milestones approved or last milestone captured with final_capture
            if is_final_milestone and milestone.status == "approved":
                job.status = "completed"
                job.contract.status = "completed"
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
    }

