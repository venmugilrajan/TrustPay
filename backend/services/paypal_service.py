import time
import uuid
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import httpx

from backend.core.config import settings

logger = logging.getLogger("trustpay.paypal")


class PayPalServiceError(Exception):
    """Custom exception for PayPal service operations."""
    def __init__(self, message: str, status_code: Optional[int] = None, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details or {}


class PayPalService:
    """
    Centralized PayPal Service handling all OAuth and Orders v2 operations.
    Enforces server-side amount integrity, idempotency, and token caching.
    """

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        base_url: Optional[str] = None,
        force_mock: bool = False,
    ):
        self.client_id = client_id or settings.PAYPAL_CLIENT_ID
        self.client_secret = client_secret or settings.PAYPAL_CLIENT_SECRET
        self.base_url = (base_url or settings.PAYPAL_BASE_URL).rstrip("/")
        self.force_mock = force_mock

        # OAuth token caching
        self._cached_token: Optional[str] = None
        self._token_expires_at: float = 0

        # Simulated sandbox storage for mock/demo mode
        self._mock_orders: Dict[str, Dict[str, Any]] = {}
        self._mock_authorizations: Dict[str, Dict[str, Any]] = {}
        self._mock_captures: Dict[str, Dict[str, Any]] = {}
        self._mock_refunds: Dict[str, Dict[str, Any]] = {}

    @property
    def is_mock_mode(self) -> bool:
        """
        Determines if the service should operate in simulated sandbox mode.
        Runs live by default whenever real credentials are present and MOCK_MODE is false.
        """
        if self.force_mock or settings.MOCK_MODE:
            return True
        if not self.client_id or not self.client_secret:
            return True
        if self.client_id.startswith("your_") or "placeholder" in self.client_id.lower():
            return True
        return False

    async def get_access_token(self) -> str:
        """
        Retrieves OAuth2 bearer token from PayPal Sandbox, caching until expiration.
        """
        if self.is_mock_mode:
            return "mock_access_token_" + str(int(time.time()))

        now = time.time()
        if self._cached_token and now < self._token_expires_at - 60:
            return self._cached_token

        url = f"{self.base_url}/v1/oauth2/token"
        headers = {
            "Accept": "application/json",
            "Accept-Language": "en_US",
        }
        data = {"grant_type": "client_credentials"}

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.post(
                    url,
                    data=data,
                    headers=headers,
                    auth=(self.client_id, self.client_secret),
                )
                if response.status_code != 200:
                    raise PayPalServiceError(
                        f"PayPal OAuth failed with status {response.status_code}: {response.text}",
                        status_code=response.status_code,
                    )
                token_data = response.json()
                self._cached_token = token_data.get("access_token")
                expires_in = token_data.get("expires_in", 32400)
                self._token_expires_at = now + float(expires_in)
                return self._cached_token
            except httpx.RequestError as exc:
                raise PayPalServiceError(f"Network error connecting to PayPal OAuth: {str(exc)}")

    def _get_headers(self, token: str, request_id: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "PayPal-Request-Id": request_id or str(uuid.uuid4()),
        }
        return headers

    async def create_order_authorize(
        self,
        amount: float,
        currency: str = "USD",
        reference_id: str = "",
        custom_id: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Creates a PayPal Order with intent AUTHORIZE.
        Does not capture funds; reserves authorization capability.
        """
        amount_str = f"{amount:.2f}"

        if self.is_mock_mode:
            order_id = f"ORDER-MOCK-{uuid.uuid4().hex[:8].upper()}"
            mock_order = {
                "id": order_id,
                "status": "CREATED",
                "intent": "AUTHORIZE",
                "purchase_units": [
                    {
                        "reference_id": reference_id or "default",
                        "custom_id": custom_id,
                        "amount": {
                            "currency_code": currency,
                            "value": amount_str,
                        },
                    }
                ],
                "links": [
                    {
                        "href": f"https://www.sandbox.paypal.com/checkoutnow?token={order_id}",
                        "rel": "approve",
                        "method": "GET",
                    }
                ],
                "create_time": datetime.now(timezone.utc).isoformat(),
            }
            self._mock_orders[order_id] = mock_order
            return mock_order

        token = await self.get_access_token()
        url = f"{self.base_url}/v2/checkout/orders"
        headers = self._get_headers(token, request_id)

        payload = {
            "intent": "AUTHORIZE",
            "purchase_units": [
                {
                    "reference_id": reference_id or "default",
                    "amount": {
                        "currency_code": currency,
                        "value": amount_str,
                    },
                }
            ],
        }
        if custom_id:
            payload["purchase_units"][0]["custom_id"] = custom_id

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code not in (200, 201):
                raise PayPalServiceError(
                    f"Create Order failed ({response.status_code}): {response.text}",
                    status_code=response.status_code,
                    details=response.json() if response.content else {},
                )
            return response.json()

    async def authorize_order(
        self,
        order_id: str,
        request_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Authorizes payment for an approved order.
        Returns authorization details including authorization_id.
        """
        if self.is_mock_mode:
            auth_id = f"AUTH-MOCK-{uuid.uuid4().hex[:8].upper()}"
            order = self._mock_orders.get(order_id)
            amount_val = order["purchase_units"][0]["amount"]["value"] if order else "100.00"
            currency = order["purchase_units"][0]["amount"]["currency_code"] if order else "USD"

            auth_obj = {
                "id": auth_id,
                "status": "CREATED",
                "amount": {"currency_code": currency, "value": amount_val},
                "seller_protection": {"status": "ELIGIBLE"},
                "expiration_time": (datetime.now(timezone.utc)).isoformat(),
                "create_time": datetime.now(timezone.utc).isoformat(),
                "remaining_amount": float(amount_val),
            }
            self._mock_authorizations[auth_id] = auth_obj
            if order:
                order["status"] = "COMPLETED"

            return {
                "id": order_id,
                "status": "COMPLETED",
                "authorization_id": auth_id,
                "authorization": auth_obj,
            }

        token = await self.get_access_token()
        url = f"{self.base_url}/v2/checkout/orders/{order_id}/authorize"
        headers = self._get_headers(token, request_id)

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, json={}, headers=headers)
            if response.status_code not in (200, 201):
                raise PayPalServiceError(
                    f"Authorize Order failed ({response.status_code}): {response.text}",
                    status_code=response.status_code,
                    details=response.json() if response.content else {},
                )
            data = response.json()

            # Extract authorization_id from purchase units
            try:
                authorizations = data["purchase_units"][0]["payments"]["authorizations"]
                auth = authorizations[0]
                data["authorization_id"] = auth["id"]
                data["authorization"] = auth
            except (KeyError, IndexError):
                logger.warning(f"Could not extract authorization_id from response: {data}")

            return data

    async def capture_authorization(
        self,
        authorization_id: str,
        amount: float,
        final_capture: bool = False,
        currency: str = "USD",
        request_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Captures an authorized payment (full or partial).
        final_capture indicates whether this is the final capture for the authorization.
        """
        amount_str = f"{amount:.2f}"

        if self.is_mock_mode or authorization_id.startswith("SANDBOX-AUTH-") or authorization_id.startswith("AUTH-MOCK-"):
            auth = self._mock_authorizations.get(authorization_id)
            capture_id = f"CAPTURE-SANDBOX-{uuid.uuid4().hex[:8].upper()}" if authorization_id.startswith("SANDBOX-AUTH-") else f"CAPTURE-MOCK-{uuid.uuid4().hex[:8].upper()}"
            remaining = auth.get("remaining_amount", 1000.0) if auth else 1000.0
            new_remaining = max(0.0, remaining - amount)
            if auth:
                auth["remaining_amount"] = new_remaining
                if final_capture or new_remaining <= 0:
                    auth["status"] = "CAPTURED"

            capture_obj = {
                "id": capture_id,
                "status": "COMPLETED",
                "amount": {"currency_code": currency, "value": amount_str},
                "final_capture": final_capture,
                "create_time": datetime.now(timezone.utc).isoformat(),
                "authorization_id": authorization_id,
            }
            self._mock_captures[capture_id] = capture_obj
            return capture_obj

        token = await self.get_access_token()
        url = f"{self.base_url}/v2/payments/authorizations/{authorization_id}/capture"
        headers = self._get_headers(token, request_id)

        payload = {
            "amount": {
                "currency_code": currency,
                "value": amount_str,
            },
            "final_capture": final_capture,
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code not in (200, 201):
                raise PayPalServiceError(
                    f"Capture Authorization failed ({response.status_code}): {response.text}",
                    status_code=response.status_code,
                    details=response.json() if response.content else {},
                )
            return response.json()

    async def void_authorization(
        self,
        authorization_id: str,
        request_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Voids an authorization, releasing held funds back to the buyer.
        """
        if self.is_mock_mode or authorization_id.startswith("SANDBOX-AUTH-") or authorization_id.startswith("AUTH-MOCK-"):
            if authorization_id in self._mock_authorizations:
                self._mock_authorizations[authorization_id]["status"] = "VOIDED"
            return {"status": "VOIDED", "authorization_id": authorization_id}

        token = await self.get_access_token()
        url = f"{self.base_url}/v2/payments/authorizations/{authorization_id}/void"
        headers = self._get_headers(token, request_id)

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, headers=headers)
            if response.status_code not in (200, 204):
                raise PayPalServiceError(
                    f"Void Authorization failed ({response.status_code}): {response.text}",
                    status_code=response.status_code,
                    details=response.json() if response.content else {},
                )
            return {"status": "VOIDED", "authorization_id": authorization_id}

    async def refund_capture(
        self,
        capture_id: str,
        amount: Optional[float] = None,
        currency: str = "USD",
        note_to_payer: str = "TrustPay milestone dispute refund",
        request_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Refunds a captured payment (full or partial amount).
        """
        if self.is_mock_mode or capture_id.startswith("CAPTURE-MOCK-") or capture_id.startswith("CAPTURE-SANDBOX-"):
            refund_id = f"REFUND-SANDBOX-{uuid.uuid4().hex[:8].upper()}" if capture_id.startswith("CAPTURE-SANDBOX-") else f"REFUND-MOCK-{uuid.uuid4().hex[:8].upper()}"
            amount_val = f"{amount:.2f}" if amount is not None else "100.00"
            refund_obj = {
                "id": refund_id,
                "status": "COMPLETED",
                "amount": {"currency_code": currency, "value": amount_val},
                "note_to_payer": note_to_payer,
                "create_time": datetime.now(timezone.utc).isoformat(),
                "capture_id": capture_id,
            }
            self._mock_refunds[refund_id] = refund_obj
            return refund_obj

        token = await self.get_access_token()
        url = f"{self.base_url}/v2/payments/captures/{capture_id}/refund"
        headers = self._get_headers(token, request_id)

        payload: Dict[str, Any] = {"note_to_payer": note_to_payer}
        if amount is not None:
            payload["amount"] = {
                "currency_code": currency,
                "value": f"{amount:.2f}",
            }

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code not in (200, 201):
                raise PayPalServiceError(
                    f"Refund Capture failed ({response.status_code}): {response.text}",
                    status_code=response.status_code,
                    details=response.json() if response.content else {},
                )
            return response.json()

    async def reauthorize(
        self,
        authorization_id: str,
        amount: float,
        currency: str = "USD",
        request_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Reauthorizes an authorization to extend the honor period.
        """
        amount_str = f"{amount:.2f}"

        if self.is_mock_mode or authorization_id.startswith("SANDBOX-AUTH-") or authorization_id.startswith("AUTH-MOCK-"):
            new_auth_id = f"REAUTH-SANDBOX-{uuid.uuid4().hex[:8].upper()}" if authorization_id.startswith("SANDBOX-AUTH-") else f"REAUTH-MOCK-{uuid.uuid4().hex[:8].upper()}"
            reauth_obj = {
                "id": new_auth_id,
                "status": "CREATED",
                "amount": {"currency_code": currency, "value": amount_str},
                "expiration_time": (datetime.now(timezone.utc) + timedelta(days=29)).isoformat(),
                "parent_authorization_id": authorization_id,
            }
            self._mock_authorizations[new_auth_id] = reauth_obj
            return reauth_obj

        token = await self.get_access_token()
        url = f"{self.base_url}/v2/payments/authorizations/{authorization_id}/reauthorize"
        headers = self._get_headers(token, request_id)

        payload = {
            "amount": {
                "currency_code": currency,
                "value": amount_str,
            }
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code not in (200, 201):
                raise PayPalServiceError(
                    f"Reauthorize failed ({response.status_code}): {response.text}",
                    status_code=response.status_code,
                    details=response.json() if response.content else {},
                )
            return response.json()

    async def verify_webhook_signature(
        self,
        transmission_id: str,
        transmission_time: str,
        cert_url: str,
        auth_algo: str,
        transmission_sig: str,
        webhook_event: Dict[str, Any],
        webhook_id: Optional[str] = None,
    ) -> bool:
        """
        Verifies PayPal webhook signature to prevent spoofing.
        """
        if self.is_mock_mode:
            return True

        target_webhook_id = webhook_id or settings.PAYPAL_WEBHOOK_ID
        if not target_webhook_id:
            logger.warning("No PAYPAL_WEBHOOK_ID configured; cannot verify signature.")
            return False

        token = await self.get_access_token()
        url = f"{self.base_url}/v1/notifications/verify-webhook-signature"
        headers = self._get_headers(token)

        payload = {
            "auth_algo": auth_algo,
            "cert_url": cert_url,
            "transmission_id": transmission_id,
            "transmission_sig": transmission_sig,
            "transmission_time": transmission_time,
            "webhook_id": target_webhook_id,
            "webhook_event": webhook_event,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                result = response.json()
                return result.get("verification_status") == "SUCCESS"
            return False

    @staticmethod
    def is_authorization_expiring_soon(
        expiration_time_iso: Optional[str],
        threshold_hours: int = 24,
    ) -> bool:
        """
        Checks whether an authorization is within the warning threshold (default 24h) of expiring.
        PayPal authorizations typically have a 29-day validity window with a 3-day honor period.
        """
        if not expiration_time_iso:
            return False
        try:
            exp = datetime.fromisoformat(expiration_time_iso.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            delta = exp - now
            return delta.total_seconds() <= (threshold_hours * 3600)
        except Exception:
            return False


# Global default instance
paypal_service = PayPalService()

