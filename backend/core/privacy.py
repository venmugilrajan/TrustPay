import re
from typing import Optional, List


def strip_structured_amounts_from_text(text: str, amounts: List[float]) -> str:
    """
    Strips structured proposal amounts (e.g. proposed_price, milestone amounts)
    from narrative text before scanning for leaked private limits.
    """
    clean_text = text
    for amt in amounts:
        if amt is None or amt <= 0:
            continue
        int_val = int(round(amt))
        flt_val = round(amt, 2)
        # Patterns to strip
        patterns = [
            rf"\${int_val:,}(?:\.\d{{1,2}})?\b",
            rf"\${flt_val:.2f}\b",
            rf"\${flt_val:.1f}\b",
            rf"\${int_val}\b",
            rf"\b{flt_val:.2f}\b",
            rf"\b{int_val:,}\b",
            rf"\b{int_val}\b",
        ]
        for pat in patterns:
            clean_text = re.sub(pat, " [STRUCTURED_PRICE] ", clean_text, flags=re.IGNORECASE)
    return clean_text


def scan_for_private_number_leak(
    text: str,
    secret_number: float,
    allowed_structured_amounts: Optional[List[float]] = None,
) -> bool:
    """
    Scans narrative text for leaks of secret_number.
    1. First strips any allowed structured prices (e.g. proposed_price or milestone amounts).
    2. Then scans the remaining text for integer, float, comma-separated, and shorthand representations of secret_number.
    3. Also checks for explicit leak disclosure phrases (e.g. 'budget ceiling', 'min price', 'minimum price').
    """
    if not text or secret_number <= 0:
        return False

    # Check for direct phrase leaks
    leak_phrases = [
        r"max(?:imum)?\s+budget",
        r"budget\s+ceiling",
        r"min(?:imum)?\s+price",
        r"price\s+floor",
        r"private\s+limit",
    ]
    for lp in leak_phrases:
        if re.search(rf"{lp}.*?\b{int(round(secret_number))}\b", text, flags=re.IGNORECASE):
            return True

    # Strip structured amounts
    amounts_to_strip = allowed_structured_amounts or []
    stripped_text = strip_structured_amounts_from_text(text, amounts_to_strip)

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
        if re.search(pat, stripped_text, flags=re.IGNORECASE):
            return True

    return False

