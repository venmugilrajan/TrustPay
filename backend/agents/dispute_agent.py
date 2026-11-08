from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field

from backend.services.llm_service import llm_service


class DisputeRulingOutput(BaseModel):
    ruling: Literal["client_favor", "freelancer_favor", "split"] = Field(
        description="Binding ruling: 'client_favor' (full refund), 'freelancer_favor' (full payout), or 'split'"
    )
    amount_to_capture: float = Field(ge=0.0, description="Amount to pay the freelancer from the milestone")
    amount_to_refund: float = Field(ge=0.0, description="Amount to refund/void back to the client")
    reasoning: str = Field(description="Impartial legal/technical rationale citing evidence and contract terms")


DISPUTE_AGENT_SYSTEM_PROMPT = """You are the impartial Dispute Arbitrator for TrustPay.
Both parties have agreed to your binding arbitration as part of the smart contract escrow.

DUTIES:
1. Examine the milestone criteria, deliverable submission, the AI Judge's evaluation, and the dispute claim.
2. The AI can ONLY act within the contract both humans approved. You cannot award more than the milestone amount.
3. Determine fair apportionment:
   - client_favor: 0 capture, 100% refund of milestone amount.
   - freelancer_favor: 100% capture of milestone amount, 0 refund.
   - split: fair proportional allocation based on demonstrated partial completion.
4. Total of amount_to_capture + amount_to_refund must equal the milestone amount.
5. Provide clear, objective reasoning citing specific criteria and evidence.
6. Output strict JSON matching the schema.
"""


def _generate_mock_dispute_output(
    milestone_amount: float,
    raised_by: str,
    reason: str,
    judge_verdict: str,
) -> DisputeRulingOutput:
    """Deterministic fallback for tests and offline demo."""
    if raised_by == "client":
        # Compromise: partial refund, partial compensation for legitimate work done
        capture = round(milestone_amount * 0.4, 2)
        refund = round(milestone_amount - capture, 2)
        ruling = "split"
        reasoning = (
            f"Upon independent review of the client's dispute claiming '{reason}', "
            f"the evidence indicates foundational work was completed, but certain edge cases were not fully met. "
            f"An equitable split is ordered: ${capture:.2f} captured for verified work, ${refund:.2f} refunded to client."
        )
    else:
        # Freelancer raised dispute against harsh score
        capture = round(milestone_amount * 0.8, 2)
        refund = round(milestone_amount - capture, 2)
        ruling = "freelancer_favor" if capture >= milestone_amount * 0.8 else "split"
        reasoning = (
            f"The freelancer's dispute demonstrates that core criteria were satisfied despite minor formatting deductions. "
            f"Releasing ${capture:.2f} to freelancer and returning ${refund:.2f}."
        )

    return DisputeRulingOutput(
        ruling=ruling,
        amount_to_capture=capture,
        amount_to_refund=refund,
        reasoning=reasoning,
    )


async def run_dispute_agent_arbitration(
    milestone_title: str,
    milestone_amount: float,
    acceptance_criteria: List[Dict[str, Any]],
    judge_evaluation: Dict[str, Any],
    raised_by: str,
    dispute_reason: str,
) -> DisputeRulingOutput:
    """
    Executes dispute arbitration using the Dispute Agent.
    """
    user_prompt = f"""
Dispute Arbitration Case:
Milestone: {milestone_title} (Total: ${milestone_amount:.2f} USD)

Criteria:
{acceptance_criteria}

Judge's Previous Verdict & Score:
- Verdict: {judge_evaluation.get('verdict')}
- Overall Score: {judge_evaluation.get('overall_score')}
- Feedback: {judge_evaluation.get('feedback_for_freelancer')}
- Criterion Results: {judge_evaluation.get('per_criterion_results')}

Dispute Claim:
- Raised By: {raised_by}
- Reason: {dispute_reason}

Issue your binding ruling. The sum of amount_to_capture + amount_to_refund must equal ${milestone_amount:.2f}.
"""

    def mock_gen(model_cls):
        return _generate_mock_dispute_output(
            milestone_amount=milestone_amount,
            raised_by=raised_by,
            reason=dispute_reason,
            judge_verdict=judge_evaluation.get("verdict", "fail"),
        )

    ruling_output = await llm_service.generate_structured(
        system_prompt=DISPUTE_AGENT_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        response_model=DisputeRulingOutput,
        temperature=0.2,
        mock_generator_fn=mock_gen,
    )

    # Invariant safety check: cap amounts to milestone_amount
    total_awarded = round(ruling_output.amount_to_capture + ruling_output.amount_to_refund, 2)
    target = round(milestone_amount, 2)
    if abs(total_awarded - target) > 0.05:
        ruling_output.amount_to_refund = max(0.0, round(target - ruling_output.amount_to_capture, 2))

    return ruling_output

