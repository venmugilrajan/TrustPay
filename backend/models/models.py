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
    Index,
)
from sqlalchemy.orm import relationship
from backend.core.database import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(100), primary_key=True)  # e.g., 'client-maya', 'freelancer-arjun'
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, unique=True)
    role = Column(String(20), nullable=False)  # "client" or "freelancer"
    title = Column(String(150), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)


# Default demo users
DEFAULT_DEMO_USERS = [
    {
        "id": "client-maya",
        "name": "Maya Patel",
        "email": "maya@acme-ventures.io",
        "role": "client",
        "title": "Head of Engineering, Acme Ventures",
    },
    {
        "id": "client-northwind",
        "name": "Northwind Studio",
        "email": "ops@northwindstudio.design",
        "role": "client",
        "title": "Product Studio Director",
    },
    {
        "id": "freelancer-arjun",
        "name": "Arjun Kumar",
        "email": "arjun.k@fullstack.dev",
        "role": "freelancer",
        "title": "Senior Full-Stack & Python Architect",
    },
    {
        "id": "freelancer-sofia",
        "name": "Sofia Reyes",
        "email": "sofia.reyes@nextgen.co",
        "role": "freelancer",
        "title": "AI & Systems Integration Specialist",
    },
]


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String(100), nullable=False, default="client-maya")
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    deliverables = Column(Text, nullable=True)
    max_budget = Column(Float, nullable=False)  # 100% PRIVATE to client
    public_budget_estimate = Column(String(100), nullable=True)  # Public text, e.g. "$1,000 - $1,500" or null -> "Negotiable"
    currency = Column(String(10), default="USD", nullable=False)
    deadline = Column(String(50), nullable=False)
    priorities = Column(String(50), default="quality", nullable=False)  # cheap, fast, quality
    must_haves = Column(Text, nullable=True)

    # Status: open, in_negotiation, funding, funded, in_progress, completed, cancelled
    status = Column(String(50), default="open", nullable=False)

    # Legacy/convenience approval flags
    client_approved = Column(Boolean, default=False, nullable=False)
    freelancer_approved = Column(Boolean, default=False, nullable=False)

    # Tag for demo records
    is_demo = Column(Boolean, default=False, nullable=False)

    # PayPal Authorization Tracking
    paypal_order_id = Column(String(100), nullable=True)
    paypal_authorization_id = Column(String(100), nullable=True)
    paypal_status = Column(String(50), nullable=True)
    authorization_expires_at = Column(String(100), nullable=True)

    # Active funded contract (set only when funding is confirmed)
    active_contract_id = Column(String(36), ForeignKey("contracts.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    active_contract = relationship("Contract", foreign_keys=[active_contract_id], post_update=True)
    contracts = relationship("Contract", foreign_keys="Contract.job_id", back_populates="job", cascade="all, delete-orphan")
    negotiation_turns = relationship("NegotiationTurn", back_populates="job", cascade="all, delete-orphan", order_by="NegotiationTurn.round_number")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan", order_by="Application.created_at.desc()")
    audit_logs = relationship("AuditLog", back_populates="job", cascade="all, delete-orphan", order_by="AuditLog.timestamp.desc()")
    ledger_entries = relationship("PaymentLedgerEntry", back_populates="job", cascade="all, delete-orphan", order_by="PaymentLedgerEntry.created_at.desc()")

    @property
    def contract(self):
        """Active contract accessor for milestones, judge, and funding."""
        return self.active_contract or (self.contracts[0] if self.contracts else None)


class Application(Base):
    __tablename__ = "applications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    freelancer_id = Column(String(100), nullable=False, default="freelancer-arjun")
    freelancer_name = Column(String(100), nullable=False, default="Arjun Kumar")

    # Private Brief Fields (100% PRIVATE to Freelancer, never exposed to Client)
    min_price = Column(Float, nullable=False)
    preferred_price = Column(Float, nullable=False)
    time_needed_days = Column(Integer, nullable=False, default=14)
    skills = Column(String(255), nullable=True)
    exclusions = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    freelancer_brief = Column(JSON, nullable=True)

    # Status: negotiating, awaiting_decision, approved, no_deal, rejected, closed, funded
    status = Column(String(50), default="negotiating", nullable=False)
    client_accepted = Column(Boolean, default=False, nullable=False)
    freelancer_accepted = Column(Boolean, default=False, nullable=False)

    # Aliases for backwards compatibility
    @property
    def client_approved(self) -> bool:
        return self.client_accepted

    @client_approved.setter
    def client_approved(self, val: bool):
        self.client_accepted = val

    @property
    def freelancer_approved(self) -> bool:
        return self.freelancer_accepted

    @freelancer_approved.setter
    def freelancer_approved(self, val: bool):
        self.freelancer_accepted = val

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
    version = Column(Integer, default=1, nullable=False)
    total_amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    deadline = Column(String(50), nullable=False)
    status = Column(String(50), default="draft", nullable=False)  # draft, approved, funded, in_progress, completed, disputed, cancelled

    # PayPal Authorization Tracking
    paypal_order_id = Column(String(100), nullable=True)
    paypal_authorization_id = Column(String(100), nullable=True)
    authorized_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    job = relationship("Job", foreign_keys=[job_id], back_populates="contracts")
    application = relationship("Application", back_populates="contract")
    milestones = relationship("Milestone", back_populates="contract", cascade="all, delete-orphan", order_by="Milestone.order_index")
    ledger_entries = relationship("PaymentLedgerEntry", back_populates="contract", cascade="all, delete-orphan")


class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    contract_id = Column(String(36), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(String(50), nullable=False)

    # Status: pending, submitted, judging, passed, partial, failed, paid, disputed, refunded
    status = Column(String(50), default="pending", nullable=False)
    captured_amount = Column(Float, default=0.0, nullable=False)
    paid_amount = Column(Float, default=0.0, nullable=False)
    score = Column(Float, nullable=True)
    paypal_capture_id = Column(String(100), nullable=True)
    resubmissions_used = Column(Integer, default=0, nullable=False)  # max 2
    resubmission_count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    contract = relationship("Contract", back_populates="milestones")
    acceptance_criteria = relationship("AcceptanceCriterion", back_populates="milestone", cascade="all, delete-orphan")
    submissions = relationship("DeliverableSubmission", back_populates="milestone", cascade="all, delete-orphan", order_by="DeliverableSubmission.version.desc()")
    disputes = relationship("DisputeRecord", back_populates="milestone", cascade="all, delete-orphan")
    ledger_entries = relationship("PaymentLedgerEntry", back_populates="milestone", cascade="all, delete-orphan")


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
    sender = Column(String(50), nullable=False, default="client_agent")  # client_agent, freelancer_agent, client, freelancer
    agent_role = Column(String(50), nullable=False)  # "client" or "freelancer" (backwards compat)
    message = Column(Text, nullable=False)
    proposal_summary = Column(Text, nullable=True)
    proposed_price = Column(Float, nullable=True)
    timeline_days = Column(Integer, nullable=True)
    price_change_reason = Column(Text, nullable=True)
    contract_draft = Column(JSON, nullable=True)
    raw_payload = Column(JSON, nullable=True)
    agreed = Column(Boolean, default=False, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    job = relationship("Job", back_populates="negotiation_turns")
    application = relationship("Application", back_populates="negotiation_turns")


class DeliverableSubmission(Base):
    __tablename__ = "deliverable_submissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    milestone_id = Column(String(36), ForeignKey("milestones.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, default=1, nullable=False)
    submission_number = Column(Integer, default=1, nullable=False)
    submission_type = Column(String(50), nullable=False)  # code, document, image, text_url
    deliverable_type = Column(String(50), default="code", nullable=False)
    file_path = Column(String(500), nullable=True)
    content_text = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
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
    test_stdout = Column(Text, nullable=True)
    test_stderr = Column(Text, nullable=True)
    prompt_injection_flag = Column(Boolean, default=False, nullable=False)
    injection_detected = Column(Boolean, default=False, nullable=False)
    evaluated_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    submission = relationship("DeliverableSubmission", back_populates="evaluations")


class DisputeRecord(Base):
    __tablename__ = "dispute_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    contract_id = Column(String(36), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=True)
    milestone_id = Column(String(36), ForeignKey("milestones.id", ondelete="CASCADE"), nullable=False)
    raised_by = Column(String(50), nullable=False)  # client or freelancer
    initiator_id = Column(String(100), nullable=True)
    reason = Column(Text, nullable=False)
    client_statement = Column(Text, nullable=True)
    freelancer_statement = Column(Text, nullable=True)
    status = Column(String(50), default="pending", nullable=False)  # pending, reviewing, resolved
    ruling = Column(String(50), nullable=True)  # client_favor, freelancer_favor, split
    amount_to_capture = Column(Float, default=0.0, nullable=False)
    amount_to_refund = Column(Float, default=0.0, nullable=False)
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    milestone = relationship("Milestone", back_populates="disputes")


class PaymentLedgerEntry(Base):
    __tablename__ = "payments_ledger"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    contract_id = Column(String(36), ForeignKey("contracts.id", ondelete="SET NULL"), nullable=True)
    milestone_id = Column(String(36), ForeignKey("milestones.id", ondelete="SET NULL"), nullable=True)
    type = Column(String(50), nullable=False)  # authorized, captured, voided, refunded, reauthorized
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    paypal_id = Column(String(100), nullable=False)  # order_id, authorization_id, capture_id, refund_id
    actor = Column(String(100), nullable=False, default="system")
    note = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False)
    source = Column(String(50), default="paypal_sandbox_live", nullable=False)  # paypal_sandbox_live, mock, demo
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    job = relationship("Job", back_populates="ledger_entries")
    contract = relationship("Contract", back_populates="ledger_entries")
    milestone = relationship("Milestone", back_populates="ledger_entries")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(100), nullable=False)
    actor = Column(String(50), nullable=False)  # client, freelancer, client_agent, freelancer_agent, judge_agent, dispute_agent, paypal, system
    details = Column(JSON, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    job = relationship("Job", back_populates="audit_logs")


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(100), unique=True, index=True, nullable=False)
    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    processed_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
