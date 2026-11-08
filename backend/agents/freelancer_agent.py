from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from backend.schemas.schemas import ContractSchema, MilestoneSchema, AcceptanceCriterionSchema
from backend.services.llm_service import llm_service


class FreelancerNegotiationOutput(BaseModel):
    message: str = Field(description="Direct message from Freelancer Agent to Client Agent")
    proposal_summary: str = Field(description="Summary of current counter-proposal")
    proposed_price: float = Field(description="Total proposed contract price in USD for this round")
    price_change_reason: str = Field(description="Explicit rationale for this price offer compared to prior rounds")
    agreed: bool = Field(description="Set to true ONLY in round 3 or later if accepting the client's terms as final")
    contract: ContractSchema = Field(description="Full structured contract proposal")


FREELANCER_AGENT_SYSTEM_PROMPT = """You are the Freelancer Agent representing the Worker in a freelance contract negotiation for TrustPay.
Your goal is to represent the freelancer's interests:
1. Ensure fair compensation commensurate with technical complexity, without exceeding client budget.
2. Negotiate realistic delivery deadlines and clearly defined, objective acceptance criteria.
3. NEGOTIATION RULES:
   - MINIMUM 3 ROUNDS REQUIRED before any agreement can be finalized.
   - For Rounds 1 and 2: You MUST NEVER agree (agreed = false). Propose a counter-offer, adjust the price, and state clear reasons.
   - For Round 3+: If the client's proposal is fair and criteria are clear and testable, you may accept the contract (agreed = true).
   - In every turn, explicitly specify proposed_price and price_change_reason explaining the price difference.
4. Protect against scope creep by setting explicit boundaries for each milestone.
5. Total amount MUST equal the exact sum of all milestone amounts.
6. Respond ONLY with valid JSON conforming to the requested schema.
"""


def _generate_mock_freelancer_output(
    round_number: int,
    title: str,
    max_budget: float,
    deadline: str,
    client_proposal: Optional[Dict[str, Any]] = None,
) -> FreelancerNegotiationOutput:
    """Deterministic fallback enforcing minimum 3 rounds negotiation."""
    client_contract = client_proposal.get("contract_draft") if client_proposal else None
    client_amount = float(client_contract.get("total_amount", max_budget * 0.8)) if client_contract else (max_budget * 0.8)

    # Minimum 3 rounds enforced: round 1 and 2 must counter-offer
    if round_number >= 3 and client_amount >= max_budget * 0.80:
        if client_contract:
            return FreelancerNegotiationOutput(
                message=f"Thank you for negotiating in good faith. ${client_amount:.2f} is a fair price for this scope. The milestone definitions and automated criteria are clear and acceptable. I agree to these terms!",
                proposal_summary=f"Accepted client proposal of ${client_amount:.2f}.",
                proposed_price=client_amount,
                price_change_reason=f"Reached acceptable threshold at ${client_amount:.2f} (meeting 80%+ fair market rate) after {round_number} rounds of negotiation.",
                agreed=True,
                contract=ContractSchema.model_validate(client_contract),
            )

    # Counter-offer in rounds 1 or 2
    if round_number == 1:
        counter_total = round(max_budget * 0.95, 2)
        reason = f"Initial counter-offer at 95% of maximum (${max_budget:.2f}) to account for comprehensive unit testing and security verifications."
    elif round_number == 2:
        counter_total = round(max_budget * 0.90, 2)
        reason = f"Compromised down to 90% of budget (${counter_total:.2f}), offering to streamline deliverable docs while maintaining full automated test coverage."
    else:
        counter_total = round(max_budget * 0.88, 2)
        reason = f"Best and final counter at ${counter_total:.2f} balancing scope with client budget."

    m1 = round(counter_total * 0.45, 2)
    m2 = round(counter_total - m1, 2)

    return FreelancerNegotiationOutput(
        message=f"I appreciate your offer. Given the technical requirements and rigorous automated verification, I propose ${counter_total:.2f}. This ensures thorough test coverage and high quality across both milestones.",
        proposal_summary=f"Counter-offered ${counter_total:.2f} across 2 milestones.",
        proposed_price=counter_total,
        price_change_reason=reason,
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
- NEGOTIATION RULE: Minimum 3 rounds required. You CANNOT agree (agreed=false) in rounds 1 or 2.

Previous Negotiation History:
{history}

Your task:
As the Freelancer Agent, formulate your turn.
- If round_number < 3: You MUST counter-offer with agreed=false, providing proposed_price and price_change_reason.
- If round_number >= 3: If the client's previous offer is fair and acceptable, accept it (agreed=true). Otherwise, counter-offer.
- Ensure milestone amounts sum to total_amount exactly.
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

