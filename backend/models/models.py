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
    client_id = Column(String(100), nullable=False, default="client_default")
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    deliverables = Column(Text, nullable=True)
    max_budget = Column(Float, nullable=False)  # 100% PRIVATE
    public_budget_estimate = Column(String(100), nullable=True)  # Optional client-set; null/empty -> "Negotiable"
    currency = Column(String(10), default="USD", nullable=False)
    deadline = Column(String(50), nullable=False)
    priorities = Column(String(50), default="quality", nullable=False)  # cheap, fast, quality
    must_haves = Column(Text, nullable=True)

    # Status: open, negotiating, awaiting_approval, approved, funded, in_progress, disputed, completed, closed, no_deal
    status = Column(String(50), default="open", nullable=False)

    client_approved = Column(Boolean, default=False, nullable=False)
    freelancer_approved = Column(Boolean, default=False, nullable=False)

    # Flag for pre-seeded demo records vs. user-created live transactions
    is_demo = Column(Boolean, default=False, nullable=False)

    # PayPal Authorization Tracking
    paypal_order_id = Column(String(100), nullable=True)
    paypal_authorization_id = Column(String(100), nullable=True)
    paypal_status = Column(String(50), nullable=True)
    authorization_expires_at = Column(String(100), nullable=True)

    # Active funded contract
    active_contract_id = Column(String(36), ForeignKey("contracts.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    active_contract = relationship("Contract", foreign_keys=[active_contract_id], post_update=True)
    contracts = relationship("Contract", foreign_keys="Contract.job_id", back_populates="job", cascade="all, delete-orphan")
    negotiation_turns = relationship("NegotiationTurn", back_populates="job", cascade="all, delete-orphan", order_by="NegotiationTurn.round_number")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan", order_by="Application.created_at.desc()")
    audit_logs = relationship("AuditLog", back_populates="job", cascade="all, delete-orphan", order_by="AuditLog.timestamp.desc()")

    @property
    def contract(self):
        """Active contract accessor for milestones, judge, and funding."""
        return self.active_contract or (self.contracts[0] if self.contracts else None)


class Application(Base):
    __tablename__ = "applications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    freelancer_id = Column(String(100), nullable=False, default="freelancer_demo")
    freelancer_name = Column(String(100), nullable=False, default="Alex Morgan (Senior Full-Stack)")

    # Private Brief Fields (Never leaked to Client API)
    min_price = Column(Float, nullable=False)
    preferred_price = Column(Float, nullable=False)
    time_needed_days = Column(Integer, nullable=False, default=14)
    skills = Column(String(255), nullable=True)
    exclusions = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    freelancer_brief = Column(JSON, nullable=True)

    # Status: negotiating, awaiting_approval, approved, no_deal, closed, funded
    status = Column(String(50), default="negotiating", nullable=False)
    client_approved = Column(Boolean, default=False, nullable=False)
    freelancer_approved = Column(Boolean, default=False, nullable=False)
    counters_used = Column(Integer, default=0, nullable=False)  # max 2

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    job = relationship("Job", back_populates="applications")
    negotiation_turns = relationship("NegotiationTurn", back_populates="application", cascade="all, delete-orphan", order_by="NegotiationTurn.round_number")
    contract = relationship("Contract", back_populates="application", uselist=False, cascade="all, delete-orphan")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="SET NULL"), nullable=True)
    total_amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    deadline = Column(String(50), nullable=False)
    status = Column(String(50), default="draft", nullable=False)  # draft, agreed, active, completed

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    job = relationship("Job", foreign_keys=[job_id], back_populates="contracts")
    application = relationship("Application", back_populates="contract")
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
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=True)
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
    application = relationship("Application", back_populates="negotiation_turns")


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

