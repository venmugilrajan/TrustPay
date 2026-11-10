import pytest

# Specification mapping for role-aware lifecycle states
LIFECYCLE_STATES = [
    "negotiating",
    "awaiting_approval",
    "approved",
    "funded",
    "in_progress",
    "under_review",
    "verified",
    "paid",
    "completed",
    "disputed",
    "refunded",
]

CLIENT_STATUS_MAP = {
    "negotiating": "Autonomous Negotiation Active",
    "awaiting_approval": "Needs Your Decision",
    "approved": "Approved · Ready to Hold Funds",
    "funded": "Money Held Safely · In Progress",
    "in_progress": "Work Underway",
    "under_review": "Work Being Checked by AI",
    "verified": "Work Passed · Payment Releasing",
    "paid": "Payment Released & Completed",
    "completed": "Payment Released & Completed",
    "disputed": "Under Arbitration",
    "refunded": "Funds Returned",
}

FREELANCER_STATUS_MAP = {
    "negotiating": "Terms Under Negotiation",
    "awaiting_approval": "Agreement Reached · Pending Client",
    "approved": "Approved · Awaiting Safe Hold",
    "funded": "Money Secured · Work in Progress",
    "in_progress": "Active Delivery",
    "under_review": "Under Automated Verification",
    "verified": "Verified Passed · Payout Queued",
    "paid": "Payment Released to You",
    "completed": "Payment Released to You",
    "disputed": "In Dispute Review",
    "refunded": "Refund Issued",
}

BANNED_JARGON_WORDS = ["escrow", "authorization", "capture", "milestone", "acceptance criteria"]


def test_role_status_distinctness():
    """
    Assert that for every active lifecycle state, client and freelancer
    see role-tailored wording that reflects their specific perspective.
    """
    for state in ["negotiating", "awaiting_approval", "approved", "funded", "in_progress", "under_review", "verified", "paid", "completed", "disputed", "refunded"]:
        client_label = CLIENT_STATUS_MAP[state]
        freelancer_label = FREELANCER_STATUS_MAP[state]
        assert client_label != freelancer_label, f"State '{state}' has identical label for client and freelancer: {client_label}"


def test_no_jargon_in_status_labels():
    """
    Assert that no status labels contain banned technical jargon.
    """
    for state in LIFECYCLE_STATES:
        c_label = CLIENT_STATUS_MAP[state].lower()
        f_label = FREELANCER_STATUS_MAP[state].lower()
        for jargon in BANNED_JARGON_WORDS:
            assert jargon not in c_label, f"Client label for {state} contains banned word '{jargon}': {c_label}"
            assert jargon not in f_label, f"Freelancer label for {state} contains banned word '{jargon}': {f_label}"


def test_role_what_to_do_now_semantics():
    """
    Verify semantic guidance for critical states:
    - Funded: Client waits for work; Freelancer submits work.
    - Awaiting Approval: Client needs to review and approve; Freelancer waits for client sign-off.
    """
    # Client side
    assert "Decision" in CLIENT_STATUS_MAP["awaiting_approval"]
    assert "Held Safely" in CLIENT_STATUS_MAP["funded"]

    # Freelancer side
    assert "Pending Client" in FREELANCER_STATUS_MAP["awaiting_approval"]
    assert "Money Secured" in FREELANCER_STATUS_MAP["funded"]

