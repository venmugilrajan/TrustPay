from typing import List, Optional, Dict, Any, Literal, Union
from datetime import datetime
from pydantic import BaseModel, Field, model_validator


class AcceptanceCriterionSchema(BaseModel):
    id: str = Field(description="Unique criterion identifier e.g. c1, c2")
    text: str = Field(description="Clear, testable acceptance statement")
    weight: float = Field(default=1.0, ge=0.0, le=1.0, description="Weight proportion (0.0 - 1.0)")


class MilestoneSchema(BaseModel):
    id: str = Field(description="Milestone identifier e.g. m1, m2")
    title: str = Field(description="Short milestone title")
    description: str = Field(description="Detailed milestone requirements")
    amount: float = Field(gt=0.0, description="Amount in USD for this milestone")
    due_date: str = Field(description="ISO Date or string deadline")
    acceptance_criteria: List[AcceptanceCriterionSchema] = Field(
        default_factory=list,
        description="List of verifiable acceptance criteria"
    )


class ContractSchema(BaseModel):
    total_amount: float = Field(gt=0.0, description="Total agreed contract value")
    currency: str = Field(default="USD", description="Currency code (USD)")
    milestones: List[MilestoneSchema] = Field(min_length=1, description="List of agreed milestones")
    deadline: str = Field(description="Final overall contract completion deadline")

    @model_validator(mode="after")
    def validate_milestone_sum(self) -> "ContractSchema":
        milestone_sum = round(sum(m.amount for m in self.milestones), 2)
        total = round(self.total_amount, 2)
        if abs(milestone_sum - total) > 0.01:
            raise ValueError(
                f"Sum of milestone amounts ({milestone_sum:.2f}) must strictly equal total_amount ({total:.2f})"
            )
        return self


class NegotiationTurnSchema(BaseModel):
    round_number: int
    agent_role: Literal["client", "freelancer"]
    message: str
    proposal_summary: Optional[str] = None
    proposed_price: Optional[float] = None
    price_change_reason: Optional[str] = None
    contract_draft: Optional[ContractSchema] = None
    agreed: bool = False
    timestamp: Optional[datetime] = None


class JobCreateRequest(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    description: str = Field(min_length=2)
    deliverables: Optional[str] = Field(default=None, description="Explicit deliverable requirements")
    max_budget: float = Field(gt=0, description="PRIVATE: Maximum client budget allocation")
    public_budget_estimate: Optional[str] = Field(default=None, description="Optional public estimate for browsing; if omitted, shows 'Negotiable'")
    currency: str = Field(default="USD")
    deadline: str = Field(description="Target completion deadline, e.g. 2026-12-01")
    priorities: Literal["cheap", "fast", "quality"] = Field(default="quality", description="Client priority anchor")
    must_haves: Optional[str] = Field(default=None, description="Mandatory scope items")


class ApplicationCreateRequest(BaseModel):
    freelancer_id: Optional[str] = Field(default="freelancer_arjun")
    freelancer_name: Optional[str] = Field(default="Arjun Kumar")
    min_price: float = Field(gt=0, description="PRIVATE: Minimum acceptable price floor")
    preferred_price: float = Field(gt=0, description="Target counter-offer quote")
    time_needed_days: int = Field(gt=0, default=14)
    skills: Optional[Union[List[str], str]] = Field(default=None)
    exclusions: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)


class HumanDecisionRequest(BaseModel):
    role: Literal["client", "freelancer"]
    action: Literal["accept", "reject", "counter"]
    message: Optional[str] = Field(default=None, description="Counter feedback message (e.g. lower price by $50)")


class ApprovalRequest(BaseModel):
    role: Literal["client", "freelancer"]


class ApplicationResponse(BaseModel):
    id: str
    job_id: str
    freelancer_id: str
    freelancer_name: str
    # min_price is NEVER serialized here (Role protection)
    preferred_price: float
    time_needed_days: int
    skills: Optional[str] = None
    exclusions: Optional[str] = None
    notes: Optional[str] = None
    status: str
    client_approved: bool
    freelancer_approved: bool
    counters_used: int
    created_at: datetime
    updated_at: datetime
    contract: Optional["ContractResponse"] = None
    negotiation_turns: List[NegotiationTurnSchema] = []


class DeliverableSubmissionResponse(BaseModel):
    id: str
    milestone_id: str
    version: int
    submission_type: str
    file_path: Optional[str] = None
    content_text: Optional[str] = None
    submitted_at: datetime


class CriterionEvaluationResult(BaseModel):
    id: str
    text: str
    passed: bool
    score: float = Field(ge=0.0, le=1.0)
    reasoning: str
    evidence: str


class JudgeEvaluationResponse(BaseModel):
    id: str
    submission_id: str
    overall_score: float
    verdict: Literal["pass", "partial", "fail"]
    feedback_for_freelancer: str
    per_criterion_results: List[CriterionEvaluationResult]
    sandbox_evidence: Optional[Dict[str, Any]] = None
    injection_detected: bool = False
    evaluated_at: datetime


class DisputeCreateRequest(BaseModel):
    raised_by: Literal["client", "freelancer"]
    reason: str = Field(min_length=10)


class DisputeResponse(BaseModel):
    id: str
    milestone_id: str
    raised_by: str
    reason: str
    status: str
    ruling: Optional[str] = None
    amount_to_capture: float = 0.0
    amount_to_refund: float = 0.0
    reasoning: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None


class AuditLogResponse(BaseModel):
    id: str
    event_type: str
    actor: str
    details: Dict[str, Any]
    timestamp: datetime


class MilestoneResponse(BaseModel):
    id: str
    contract_id: str
    order_index: int
    title: str
    description: str
    amount: float
    due_date: str
    status: str
    captured_amount: float
    paypal_capture_id: Optional[str] = None
    resubmission_count: int
    acceptance_criteria: List[Dict[str, Any]] = []
    submissions: List[DeliverableSubmissionResponse] = []
    disputes: List[DisputeResponse] = []


class ContractResponse(BaseModel):
    id: str
    job_id: str
    total_amount: float
    currency: str
    deadline: str
    status: str
    milestones: List[MilestoneResponse] = []


class JobResponse(BaseModel):
    id: str
    client_id: str = "client_default"
    title: str
    description: str
    deliverables: Optional[str] = None
    max_budget: Optional[float] = None  # Strictly None when viewed by freelancer!
    public_budget_estimate: Optional[str] = "Negotiable"  # What freelancers see
    currency: str
    deadline: str
    priorities: Optional[str] = "quality"
    must_haves: Optional[str] = None
    status: str
    client_approved: bool
    freelancer_approved: bool
    is_demo: bool = False
    paypal_order_id: Optional[str] = None
    paypal_authorization_id: Optional[str] = None
    paypal_status: Optional[str] = None
    authorization_expires_at: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    contract: Optional[ContractResponse] = None
    negotiation_turns: List[NegotiationTurnSchema] = []
    applications: List[ApplicationResponse] = []
    audit_logs: List[AuditLogResponse] = []


ApplicationResponse.model_rebuild()

