from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from backend.schemas.schemas import ContractSchema, MilestoneSchema, AcceptanceCriterionSchema
from backend.services.llm_service import llm_service


class FreelancerNegotiationOutput(BaseModel):
    message: str = Field(description="Direct message from Freelancer Agent to Client Agent")
    proposal_summary: str = Field(description="Summary of current counter-proposal")
    agreed: bool = Field(description="Set to true if accepting the client's terms as final")
    contract: ContractSchema = Field(description="Full structured contract proposal")


FREELANCER_AGENT_SYSTEM_PROMPT = """You are the Freelancer Agent representing the Worker in a freelance contract negotiation for TrustPay.
Your goal is to represent the freelancer's interests:
1. Ensure fair compensation commensurate with technical complexity, without exceeding client budget.
2. Negotiate realistic delivery deadlines and clearly defined, objective acceptance criteria.
3. Protect against scope creep by setting explicit boundaries for each milestone.
4. Total amount MUST equal the exact sum of all milestone amounts.
5. If the client's proposal is fair and criteria are clear and testable, accept the contract (agreed=true).
6. Respond ONLY with valid JSON conforming to the requested schema.
"""


def _generate_mock_freelancer_output(
    round_number: int,
    title: str,
    max_budget: float,
    deadline: str,
    client_proposal: Optional[Dict[str, Any]] = None,
) -> FreelancerNegotiationOutput:
    """Deterministic fallback for local testing / offline runs."""
    # If client made an offer
    client_contract = client_proposal.get("contract_draft") if client_proposal else None
    client_amount = float(client_contract.get("total_amount", max_budget * 0.8)) if client_contract else (max_budget * 0.8)

    if round_number >= 2 and client_amount >= max_budget * 0.85:
        # Agree to client's terms
        if client_contract:
            return FreelancerNegotiationOutput(
                message=f"Thank you for the proposal. ${client_amount:.2f} is a fair price for this scope. The milestone definitions and automated criteria are clear and acceptable. I agree to these terms!",
                proposal_summary=f"Accepted client proposal of ${client_amount:.2f}.",
                agreed=True,
                contract=ContractSchema.model_validate(client_contract),
            )

    # Counter-offer: propose 95% of max budget with refined criteria
    counter_total = round(max_budget * 0.95, 2)
    m1 = round(counter_total * 0.45, 2)
    m2 = round(counter_total - m1, 2)

    return FreelancerNegotiationOutput(
        message=f"I appreciate your initial offer. Given the technical requirements and rigorous automated verification, I propose ${counter_total:.2f}. This ensures thorough test coverage and high quality across both milestones.",
        proposal_summary=f"Counter-offered ${counter_total:.2f} across 2 milestones.",
        agreed=False,
        contract=ContractSchema(
            total_amount=counter_total,
            currency="USD",
            deadline=deadline,
            milestones=[
                MilestoneSchema(
                    id="m1",
                    title="Core Architecture & Backend Logic",
                    description="Implement core logic, database models, and automated test suite.",
                    amount=m1,
                    due_date="2026-11-20",
                    acceptance_criteria=[
                        AcceptanceCriterionSchema(id="c1", text="Automated unit test suite passes with 100% success rate", weight=0.5),
                        AcceptanceCriterionSchema(id="c2", text="Code conforms to security standards with zero injection vulnerabilities", weight=0.5),
                    ],
                ),
                MilestoneSchema(
                    id="m2",
                    title="Frontend & Integration Delivery",
                    description="Deliver polished frontend dashboard and complete API integration.",
                    amount=m2,
                    due_date="2026-11-28",
                    acceptance_criteria=[
                        AcceptanceCriterionSchema(id="c3", text="UI loads correctly without console errors", weight=0.5),
                        AcceptanceCriterionSchema(id="c4", text="End-to-end user workflow functions reliably", weight=0.5),
                    ],
                ),
            ],
        ),
    )


async def run_freelancer_agent_turn(
    job_title: str,
    job_description: str,
    max_budget: float,
    deadline: str,
    round_number: int,
    history: List[Dict[str, Any]],
) -> FreelancerNegotiationOutput:
    """
    Executes a negotiation turn for the Freelancer Agent.
    """
    last_client_turn = None
    for turn in reversed(history):
        if turn.get("agent_role") == "client":
            last_client_turn = turn
            break

    user_prompt = f"""
Negotiation Context:
- Job Title: {job_title}
- Job Description: {job_description}
- Max Budget: ${max_budget:.2f} USD
- Target Deadline: {deadline}
- Current Round: {round_number} (Maximum 6 rounds allowed)

Previous Negotiation History:
{history}

Your task:
As the Freelancer Agent, formulate your turn. If the client's previous offer is fair and acceptable, accept it (agreed=true).
Otherwise, counter-offer with reasonable terms.
Ensure milestone amounts sum to total_amount exactly.
"""

    def mock_gen(model_cls):
        return _generate_mock_freelancer_output(
            round_number=round_number,
            title=job_title,
            max_budget=max_budget,
            deadline=deadline,
            client_proposal=last_client_turn,
        )

    return await llm_service.generate_structured(
        system_prompt=FREELANCER_AGENT_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        response_model=FreelancerNegotiationOutput,
        temperature=0.2,
        mock_generator_fn=mock_gen,
    )
