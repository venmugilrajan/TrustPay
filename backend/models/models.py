import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship
from backend.core.database import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    max_budget = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    deadline = Column(String(50), nullable=False)

    # Status: negotiating, awaiting_approval, funded, in_progress, disputed, completed, no_deal
    status = Column(String(50), default="negotiating", nullable=False)

    client_approved = Column(Boolean, default=False, nullable=False)
    freelancer_approved = Column(Boolean, default=False, nullable=False)

    # Flag for pre-seeded demo records vs. user-created live transactions
    is_demo = Column(Boolean, default=False, nullable=False)

    # PayPal Authorization Tracking
    paypal_order_id = Column(String(100), nullable=True)
    paypal_authorization_id = Column(String(100), nullable=True)
    paypal_status = Column(String(50), nullable=True)
    authorization_expires_at = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    contract = relationship("Contract", back_populates="job", uselist=False, cascade="all, delete-orphan")
    negotiation_turns = relationship("NegotiationTurn", back_populates="job", cascade="all, delete-orphan", order_by="NegotiationTurn.round_number")
    audit_logs = relationship("AuditLog", back_populates="job", cascade="all, delete-orphan", order_by="AuditLog.timestamp.desc()")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, unique=True)
    total_amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    deadline = Column(String(50), nullable=False)
    status = Column(String(50), default="draft", nullable=False)  # draft, agreed, active, completed

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    job = relationship("Job", back_populates="contract")
    milestones = relationship("Milestone", back_populates="contract", cascade="all, delete-orphan", order_by="Milestone.order_index")


class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    contract_id = Column(String(36), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(String(50), nullable=False)

    # Status: pending, submitted, evaluating, approved, partial_approval, rejected, disputed, completed
    status = Column(String(50), default="pending", nullable=False)
    captured_amount = Column(Float, default=0.0, nullable=False)
    paypal_capture_id = Column(String(100), nullable=True)
    resubmission_count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    # Relationships
    contract = relationship("Contract", back_populates="milestones")
    acceptance_criteria = relationship("AcceptanceCriterion", back_populates="milestone", cascade="all, delete-orphan")
    submissions = relationship("DeliverableSubmission", back_populates="milestone", cascade="all, delete-orphan", order_by="DeliverableSubmission.version.desc()")
    disputes = relationship("DisputeRecord", back_populates="milestone", cascade="all, delete-orphan")


class AcceptanceCriterion(Base):
    __tablename__ = "acceptance_criteria"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    milestone_id = Column(String(36), ForeignKey("milestones.id", ondelete="CASCADE"), nullable=False)
    criterion_key = Column(String(50), nullable=False)  # e.g., 'c1', 'c2'
    text = Column(Text, nullable=False)
    weight = Column(Float, default=1.0, nullable=False)

    milestone = relationship("Milestone", back_populates="acceptance_criteria")


class NegotiationTurn(Base):
    __tablename__ = "negotiation_turns"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    round_number = Column(Integer, nullable=False)
    agent_role = Column(String(50), nullable=False)  # "client" or "freelancer"
    message = Column(Text, nullable=False)
    proposal_summary = Column(Text, nullable=True)
    proposed_price = Column(Float, nullable=True)
    price_change_reason = Column(Text, nullable=True)
    contract_draft = Column(JSON, nullable=True)
    agreed = Column(Boolean, default=False, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    job = relationship("Job", back_populates="negotiation_turns")


class DeliverableSubmission(Base):
    __tablename__ = "deliverable_submissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    milestone_id = Column(String(36), ForeignKey("milestones.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, default=1, nullable=False)
    submission_type = Column(String(50), nullable=False)  # code, document, image, text_url
    file_path = Column(String(500), nullable=True)
    content_text = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    milestone = relationship("Milestone", back_populates="submissions")
    evaluations = relationship("JudgeEvaluation", back_populates="submission", cascade="all, delete-orphan")


class JudgeEvaluation(Base):
    __tablename__ = "judge_evaluations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id = Column(String(36), ForeignKey("deliverable_submissions.id", ondelete="CASCADE"), nullable=False)
    overall_score = Column(Float, nullable=False)
    verdict = Column(String(50), nullable=False)  # pass, partial, fail
    feedback_for_freelancer = Column(Text, nullable=False)
    per_criterion_results = Column(JSON, nullable=False)  # list of {id, text, passed, score, reasoning, evidence}
    sandbox_evidence = Column(JSON, nullable=True)
    injection_detected = Column(Boolean, default=False, nullable=False)
    evaluated_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    submission = relationship("DeliverableSubmission", back_populates="evaluations")


class DisputeRecord(Base):
    __tablename__ = "dispute_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    milestone_id = Column(String(36), ForeignKey("milestones.id", ondelete="CASCADE"), nullable=False)
    raised_by = Column(String(50), nullable=False)  # client or freelancer
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # pending, resolved
    ruling = Column(String(50), nullable=True)  # client_favor, freelancer_favor, split
    amount_to_capture = Column(Float, default=0.0, nullable=False)
    amount_to_refund = Column(Float, default=0.0, nullable=False)
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    milestone = relationship("Milestone", back_populates="disputes")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(100), nullable=False)
    actor = Column(String(50), nullable=False)  # client, freelancer, client_agent, freelancer_agent, judge_agent, dispute_agent, paypal, system
    details = Column(JSON, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    job = relationship("Job", back_populates="audit_logs")

