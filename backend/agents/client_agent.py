import re
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field

from backend.schemas.schemas import ContractSchema, MilestoneSchema, AcceptanceCriterionSchema
from backend.services.llm_service import llm_service
from backend.core.privacy import scan_for_private_number_leak


class ClientNegotiationOutput(BaseModel):
    message: str = Field(description="Direct message from Client Agent to Freelancer Agent (NEVER reveal private max_budget)")
    proposal_summary: str = Field(description="Summary of current counter-proposal")
    proposed_price: float = Field(description="Total proposed contract price in USD for this round")
    price_change_reason: str = Field(description="Explicit rationale for this price offer compared to prior rounds")
    agreed: bool = Field(description="Set to true ONLY in round 3 or later if terms are acceptable")
    contract: ContractSchema = Field(description="Full structured contract proposal")


CLIENT_AGENT_SYSTEM_PROMPT = """You are the Client Agent representing the Buyer in a freelance contract negotiation for TrustPay.
Your goal is to represent the buyer's interests:
1. Secure high-quality work strictly at or below the buyer's PRIVATE max budget.
2. PRIVACY MANDATE: NEVER reveal, mention, or hint at the exact private max budget ceiling in any public message or reason.
3. Align terms with the buyer's priorities (cheap, fast, or quality) and ensure must-have requirements are reflected.
4. NEGOTIATION RULES:
   - MINIMUM 3 ROUNDS REQUIRED before any agreement can be finalized.
   - For Rounds 1 and 2: You MUST NEVER agree (agreed = false). Propose a counter-offer, adjust price, and state clear reasons.
   - For Round 3+: If the freelancer's offer is fair, within budget, and criteria are realistic, you may agree (agreed = true).
   - In every turn, explicitly specify proposed_price and price_change_reason.
5. Total amount MUST equal the exact sum of all milestone amounts.
6. Respond ONLY with valid JSON conforming to the requested schema.
"""


def scan_for_number_leak(text: str, secret_number: float) -> bool:
    """
    Scans text for occurrences of secret_number in:
    - exact integer (e.g. 1200)
    - float (1200.00, 1200.0)
    - comma-separated (1,200, 1,200.00)
    - shorthand (1.2k)
    """
    if not text or secret_number <= 0:
        return False

    int_val = int(round(secret_number))
    float_val = round(secret_number, 2)
    patterns = [
        rf"\b{int_val}\b",
        rf"\b{float_val:.2f}\b",
        rf"\b{float_val:.1f}\b",
        rf"\b{int_val:,}\b",
        rf"\b{float_val:,.2f}\b",
    ]
    if int_val >= 1000:
        k_val = round(secret_number / 1000, 1)
        k_str = f"{k_val:g}k"
        patterns.append(rf"\b{re.escape(k_str)}\b")

    for pat in patterns:
        if re.search(pat, text, flags=re.IGNORECASE):
            return True
    return False


def _generate_mock_client_output(
    round_number: int,
    title: str,
    max_budget: float,
    deadline: str,
    priorities: str = "quality",
    must_haves: Optional[str] = None,
    freelancer_proposal: Optional[Dict[str, Any]] = None,
    human_counter_message: Optional[str] = None,
) -> ClientNegotiationOutput:
    """Deterministic fallback enforcing minimum 3 rounds and private max_budget ceiling."""
    base_ratio = 0.70 if priorities == "cheap" else (0.80 if priorities == "quality" else 0.75)
    
    if human_counter_message:
        p = round(max_budget * 0.88, 2)
        m1 = round(p * 0.45, 2)
        m2 = round(p - m1, 2)
        return ClientNegotiationOutput(
            message=f"Following client guidance ('{human_counter_message}'), I have adjusted our proposal to ${p:.2f} with refined deliverables.",
            proposal_summary=f"Human counter revision at ${p:.2f}.",
            proposed_price=p,
            price_change_reason="Adjusted proposal in response to direct client feedback.",
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
                            AcceptanceCriterionSchema(id="c1", text="Unit tests pass with 100% success rate", weight=0.5),
                            AcceptanceCriterionSchema(id="c2", text="Security compliance verified in isolated sandbox", weight=0.5),
                        ],
                    ),
                    MilestoneSchema(
                        id="m2",
                        title="Integration & Final Delivery",
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

    if round_number == 1:
        p1 = round(max_budget * base_ratio, 2)
        m1 = round(p1 * 0.45, 2)
        m2 = round(p1 - m1, 2)
        return ClientNegotiationOutput(
            message=f"Hello! I am initiating terms for '{title}'. Based on required deliverables, our opening offer is ${p1:.2f} split into two milestones with strict automated testing criteria.",
            proposal_summary=f"Opening offer of ${p1:.2f} across 2 milestones.",
            proposed_price=p1,
            price_change_reason="Opening offer benchmarked to core deliverables and quality priority.",
            agreed=False,
            contract=ContractSchema(
                total_amount=p1,
                currency="USD",
                deadline=deadline,
                milestones=[
                    MilestoneSchema(
                        id="m1",
                        title="Core Architecture & Backend Logic",
                        description="Implement foundational logic and API endpoints with unit tests.",
                        amount=m1,
                        due_date="2026-11-20",
                        acceptance_criteria=[
                            AcceptanceCriterionSchema(id="c1", text="Unit tests pass with 100% success rate", weight=0.5),
                            AcceptanceCriterionSchema(id="c2", text="Code conforms to security standards with zero injection vulnerabilities", weight=0.5),
                        ],
                    ),
                    MilestoneSchema(
                        id="m2",
                        title="Frontend & Integration Delivery",
                        description="Build interactive UI and wire API endpoints.",
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

    elif round_number == 2:
        p2 = round(max_budget * min(base_ratio + 0.10, 0.90), 2)
        m1 = round(p2 * 0.45, 2)
        m2 = round(p2 - m1, 2)
        return ClientNegotiationOutput(
            message=f"I understand your perspective regarding technical complexity. I can raise our offer to ${p2:.2f}. We require strict automated sandbox verification.",
            proposal_summary=f"Increased offer to ${p2:.2f}.",
            proposed_price=p2,
            price_change_reason="Concession to accommodate specialized testing harness and environment setup.",
            agreed=False,
            contract=ContractSchema(
                total_amount=p2,
                currency="USD",
                deadline=deadline,
                milestones=[
                    MilestoneSchema(
                        id="m1",
                        title="Core Architecture & Backend Logic",
                        description="Implement foundational logic and API endpoints with unit tests.",
                        amount=m1,
                        due_date="2026-11-20",
                        acceptance_criteria=[
                            AcceptanceCriterionSchema(id="c1", text="Unit tests pass with 100% success rate", weight=0.5),
                            AcceptanceCriterionSchema(id="c2", text="Code conforms to security standards with zero injection vulnerabilities", weight=0.5),
                        ],
                    ),
                    MilestoneSchema(
                        id="m2",
                        title="Frontend & Integration Delivery",
                        description="Complete UI integration and polish.",
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

    else:
        candidate_price = None
        if freelancer_proposal:
            candidate_price = freelancer_proposal.get("proposed_price")
            if candidate_price is None and freelancer_proposal.get("contract_draft"):
                candidate_price = freelancer_proposal["contract_draft"].get("total_amount")
        if candidate_price is None:
            candidate_price = round(max_budget * 0.88, 2)
        final_price = min(float(candidate_price), float(max_budget))
        m1 = round(final_price * 0.45, 2)
        m2 = round(final_price - m1, 2)
        return ClientNegotiationOutput(
            message=f"Thank you for negotiating in good faith. ${final_price:.2f} is an agreeable price that satisfies our quality criteria. I accept these milestone terms!",
            proposal_summary=f"Agreed to contract terms at ${final_price:.2f}.",
            proposed_price=final_price,
            price_change_reason=f"Mutual agreement reached at ${final_price:.2f} balancing scope with quality criteria.",
            agreed=True,
            contract=ContractSchema(
                total_amount=final_price,
                currency="USD",
                deadline=deadline,
                milestones=[
                    MilestoneSchema(
                        id="m1",
                        title="Core Architecture & Backend Logic",
                        description="Implement foundational logic and API endpoints.",
                        amount=m1,
                        due_date="2026-11-20",
                        acceptance_criteria=[
                            AcceptanceCriterionSchema(id="c1", text="Unit tests pass with 100% success rate", weight=0.5),
                            AcceptanceCriterionSchema(id="c2", text="Code conforms to security standards with zero injection vulnerabilities", weight=0.5),
                        ],
                    ),
                    MilestoneSchema(
                        id="m2",
                        title="Frontend & Integration Delivery",
                        description="Complete UI integration and polish.",
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


async def run_client_agent_turn(
    job_title: str,
    job_description: str,
    max_budget: float,
    deadline: str,
    round_number: int,
    history: List[Dict[str, Any]],
    priorities: str = "quality",
    must_haves: Optional[str] = None,
    human_counter_message: Optional[str] = None,
) -> ClientNegotiationOutput:
    """
    Executes a negotiation turn for the Client Agent with:
    1. Reject-and-regenerate (max 2 retries) if proposed price > max_budget.
    2. Private limit text leakage scanner & regenerator.
    3. Minimum 3 rounds enforcement.
    """
    last_freelancer_turn = None
    for turn in reversed(history):
        if turn.get("agent_role") == "freelancer":
            last_freelancer_turn = turn
            break

    max_attempts = 3
    last_result = None

    for attempt in range(max_attempts):
        retry_guidance = ""
        if attempt > 0 and last_result:
            if last_result.proposed_price > max_budget:
                retry_guidance = f"\nERROR IN PREVIOUS ATTEMPT: Your proposed price (${last_result.proposed_price:.2f}) exceeded the client's private budget ceiling. You MUST propose an amount <= ${max_budget:.2f}."
            elif scan_for_number_leak(last_result.message + " " + (last_result.price_change_reason or ""), max_budget):
                retry_guidance = "\nERROR IN PREVIOUS ATTEMPT: Your message or rationale leaked the private budget ceiling number. NEVER mention or quote the exact budget number!"

        user_prompt = f"""
Negotiation Context:
- Job Title: {job_title}
- Job Description: {job_description}
- Client Priorities: {priorities}
- Must Haves: {must_haves or 'Standard quality implementation'}
- Target Deadline: {deadline}
- Current Round: {round_number} (Minimum 3 rounds required before agreement)
- PRIVATE MAX BUDGET: ${max_budget:.2f} USD (CONFIDENTIAL: NEVER disclose or cite this exact ceiling in your message or reasons!)
{f'- Human Client Directive: {human_counter_message}' if human_counter_message else ''}
{retry_guidance}

Public Negotiation History:
{history}

Your task:
As the Client Agent, formulate your turn.
CRITICAL:
1. NEVER mention the exact max budget number in message or price_change_reason.
2. If round_number < 3, you MUST set agreed=false and counter-propose with adjusted terms.
3. If round_number >= 3 and previous offer is acceptable (<= ${max_budget:.2f}), you may set agreed=true.
4. Total amount MUST equal the exact sum of milestone amounts.
5. Your proposed_price MUST strictly be <= ${max_budget:.2f}.
"""

        def mock_gen(model_cls):
            return _generate_mock_client_output(
                round_number=round_number,
                title=job_title,
                max_budget=max_budget,
                deadline=deadline,
                priorities=priorities,
                must_haves=must_haves,
                freelancer_proposal=last_freelancer_turn,
                human_counter_message=human_counter_message,
            )

        result: ClientNegotiationOutput = await llm_service.generate_structured(
            system_prompt=CLIENT_AGENT_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_model=ClientNegotiationOutput,
            temperature=0.2,
            mock_generator_fn=mock_gen,
        )

        last_result = result

        # Check 1: Price constraint
        price_invalid = result.proposed_price > max_budget

        # Check 2: Leak scanner with structured price stripping
        allowed_structured = [result.proposed_price]
        if result.contract and result.contract.milestones:
            allowed_structured.extend(m.amount for m in result.contract.milestones)

        leak_detected = scan_for_private_number_leak(
            result.message, max_budget, allowed_structured_amounts=allowed_structured
        ) or scan_for_private_number_leak(
            result.price_change_reason or "", max_budget, allowed_structured_amounts=allowed_structured
        )

        if not price_invalid and not leak_detected:
            # Valid turn
            break

    # Final enforcement without silent price editing
    if last_result.proposed_price > max_budget:
        # Reject: cannot accept or propose above budget, mark agreed=False
        last_result.agreed = False

    if round_number < 3:
        last_result.agreed = False

    return last_result
