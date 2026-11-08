from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from backend.schemas.schemas import ContractSchema, MilestoneSchema, AcceptanceCriterionSchema
from backend.services.llm_service import llm_service
from backend.core.privacy import scan_for_private_number_leak


class FreelancerNegotiationOutput(BaseModel):
    message: str = Field(description="Direct message from Freelancer Agent to Client Agent (NEVER reveal private min_price)")
    proposal_summary: str = Field(description="Summary of current counter-proposal")
    proposed_price: float = Field(description="Total proposed contract price in USD for this round")
    price_change_reason: str = Field(description="Explicit rationale for this price offer compared to prior rounds")
    agreed: bool = Field(description="Set to true ONLY in round 3 or later if accepting the client's terms as final")
    contract: ContractSchema = Field(description="Full structured contract proposal")


FREELANCER_AGENT_SYSTEM_PROMPT = """You are the Freelancer Agent representing the Worker in a freelance contract negotiation for TrustPay.
Your goal is to represent the freelancer's interests:
1. Ensure fair compensation strictly at or above the freelancer's PRIVATE minimum price floor.
2. PRIVACY MANDATE: NEVER reveal, mention, or hint at the exact private minimum price floor in any public message or reason.
3. Factor in the freelancer's technical brief (time needed, technical skills, exclusions, notes) to negotiate realistic milestones.
4. NEGOTIATION RULES:
   - MINIMUM 3 ROUNDS REQUIRED before any agreement can be finalized.
   - For Rounds 1 and 2: You MUST NEVER agree (agreed = false). Propose a counter-offer, adjust price, and state clear reasons.
   - For Round 3+: If the client's proposal is at or above your minimum price and criteria are clear, you may accept (agreed = true).
   - In every turn, explicitly specify proposed_price and price_change_reason.
5. Total amount MUST equal the exact sum of all milestone amounts.
6. Respond ONLY with valid JSON conforming to the requested schema.
"""


def _generate_mock_freelancer_output(
    round_number: int,
    title: str,
    min_price: float,
    preferred_price: float,
    deadline: str,
    skills: Optional[str] = None,
    exclusions: Optional[str] = None,
    client_proposal: Optional[Dict[str, Any]] = None,
    human_counter_message: Optional[str] = None,
) -> FreelancerNegotiationOutput:
    """Deterministic fallback enforcing minimum 3 rounds and private min_price floor."""
    client_contract = client_proposal.get("contract_draft") if client_proposal else None
    client_amount = float(client_contract.get("total_amount", min_price)) if client_contract else min_price

    if human_counter_message:
        # Human counter from freelancer or client
        p = max(round((min_price + preferred_price) / 2, 2), min_price)
        m1 = round(p * 0.45, 2)
        m2 = round(p - m1, 2)
        return FreelancerNegotiationOutput(
            message=f"Acknowledging feedback ('{human_counter_message}'), I propose adjusting the milestone scope and price to ${p:.2f} with clear acceptance criteria.",
            proposal_summary=f"Counter revision at ${p:.2f}.",
            proposed_price=p,
            price_change_reason=f"Revised terms based on negotiation feedback: {human_counter_message}",
            agreed=False,
            contract=ContractSchema(
                total_amount=p,
                currency="USD",
                deadline=deadline,
                milestones=[
                    MilestoneSchema(
                        id="m1",
                        title="Core Architecture & Test Suite",
                        description="Implement foundational logic and test harness.",
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
                        description="Complete user workflows and integration testing.",
                        amount=m2,
                        due_date="2026-11-28",
                        acceptance_criteria=[
                            AcceptanceCriterionSchema(id="c3", text="UI and API integration verified without errors", weight=0.5),
                            AcceptanceCriterionSchema(id="c4", text="End-to-end execution passes sandbox tests", weight=0.5),
                        ],
                    ),
                ],
            ),
        )

    # Minimum 3 rounds enforced: round 1 and 2 must counter-offer
    if round_number >= 3 and client_amount >= min_price:
        if client_contract:
            return FreelancerNegotiationOutput(
                message=f"Thank you for negotiating constructively. ${client_amount:.2f} satisfies our technical requirements and milestone scope. The criteria are verifiable and realistic. I agree to these terms!",
                proposal_summary=f"Accepted client proposal of ${client_amount:.2f}.",
                proposed_price=client_amount,
                price_change_reason=f"Reached acceptable milestone terms at ${client_amount:.2f} after {round_number} rounds of negotiation.",
                agreed=True,
                contract=ContractSchema.model_validate(client_contract),
            )

    # Counter-offer in rounds 1 or 2
    if round_number == 1:
        counter_total = max(preferred_price, min_price)
        reason = f"Opening quote anchored to senior expertise in {skills or 'full-stack architecture'} and complete automated test suite."
    elif round_number == 2:
        counter_total = round((preferred_price + min_price) / 2 * 1.05, 2)
        counter_total = max(counter_total, min_price)
        reason = f"Concession to reach consensus, scoping out auxiliary non-essentials ({exclusions or 'non-core extras'})."
    else:
        counter_total = max(round(min_price * 1.05, 2), min_price)
        reason = f"Best and final proposal at ${counter_total:.2f} guaranteeing rigorous test harnesses."

    m1 = round(counter_total * 0.45, 2)
    m2 = round(counter_total - m1, 2)

    return FreelancerNegotiationOutput(
        message=f"I appreciate your offer. Considering the technical scope and automated test verifications, I propose ${counter_total:.2f}. This ensures thorough test coverage and high quality across both milestones.",
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
    min_price: float,
    preferred_price: float,
    deadline: str,
    round_number: int,
    history: List[Dict[str, Any]],
    skills: Optional[str] = None,
    exclusions: Optional[str] = None,
    notes: Optional[str] = None,
    human_counter_message: Optional[str] = None,
) -> FreelancerNegotiationOutput:
    """Executes a negotiation turn for the Freelancer Agent with private floor protection."""
    last_client_turn = None
    for turn in reversed(history):
        if turn.get("agent_role") == "client":
            last_client_turn = turn
            break

    max_attempts = 3
    last_result = None

    for attempt in range(max_attempts):
        retry_guidance = ""
        if attempt > 0 and last_result:
            if last_result.proposed_price < min_price:
                retry_guidance = f"\nERROR IN PREVIOUS ATTEMPT: Your proposed price (${last_result.proposed_price:.2f}) was below your private minimum floor (${min_price:.2f}). You MUST propose an amount >= ${min_price:.2f}."
            elif scan_for_private_number_leak(last_result.message + " " + (last_result.price_change_reason or ""), min_price):
                retry_guidance = "\nERROR IN PREVIOUS ATTEMPT: Your message leaked your private minimum price floor. NEVER mention or quote the exact minimum price number!"

        user_prompt = f"""
Negotiation Context:
- Job Title: {job_title}
- Job Description: {job_description}
- Freelancer Skills: {skills or 'Full-stack engineering'}
- Exclusions: {exclusions or 'None specified'}
- Pitch Notes: {notes or 'Standard delivery'}
- Target Deadline: {deadline}
- Current Round: {round_number} (Minimum 3 rounds, Maximum 6 rounds allowed)
- PRIVATE MINIMUM PRICE: ${min_price:.2f} USD (CONFIDENTIAL: NEVER disclose or cite this exact floor in your message or reasons!)
- Preferred Target Price: ${preferred_price:.2f} USD
{f'- Human Freelancer Directive: {human_counter_message}' if human_counter_message else ''}
{retry_guidance}

Public Negotiation History:
{history}

Your task:
As the Freelancer Agent, formulate your turn.
CRITICAL:
1. NEVER mention your exact minimum price (${min_price:.2f}) in message or price_change_reason.
2. In rounds 1 and 2, you MUST set agreed=false and counter-offer.
3. In round 3+, if the client's offer is at or above your minimum price (>= ${min_price:.2f}), you may set agreed=true.
4. Total amount MUST equal the exact sum of milestone amounts.
5. Your proposed_price MUST strictly be >= ${min_price:.2f}.
"""

        def mock_gen(model_cls):
            return _generate_mock_freelancer_output(
                round_number=round_number,
                title=job_title,
                min_price=min_price,
                preferred_price=preferred_price,
                deadline=deadline,
                skills=skills,
                exclusions=exclusions,
                client_proposal=last_client_turn,
                human_counter_message=human_counter_message,
            )

        result: FreelancerNegotiationOutput = await llm_service.generate_structured(
            system_prompt=FREELANCER_AGENT_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_model=FreelancerNegotiationOutput,
            temperature=0.2,
            mock_generator_fn=mock_gen,
        )

        last_result = result

        # Check 1: Price constraint
        price_invalid = result.proposed_price < min_price

        # Check 2: Leak scanner with structured price stripping
        allowed_structured = [result.proposed_price]
        if result.contract and result.contract.milestones:
            allowed_structured.extend(m.amount for m in result.contract.milestones)

        leak_detected = scan_for_private_number_leak(
            result.message, min_price, allowed_structured_amounts=allowed_structured
        ) or scan_for_private_number_leak(
            result.price_change_reason or "", min_price, allowed_structured_amounts=allowed_structured
        )

        if not price_invalid and not leak_detected:
            # Valid turn
            break

    # Final enforcement without silent price editing
    if last_result.proposed_price < min_price:
        last_result.agreed = False

    if round_number < 3:
        last_result.agreed = False

    return last_result
