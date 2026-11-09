from __future__ import annotations
import os
import hmac
import json
import uuid
import hashlib
import datetime
from typing import Dict, Any, List, Optional
from backend.app.db import get_db_connection

SECRET_KEY = os.getenv("AGENTTOWER_SECRET_KEY", "agenttower-prototype-secret-key-32chars-min").encode("utf-8")


class PermissionBroker:
    """Cryptographic authority issuing and validating task-scoped HMAC execution tokens."""

    def __init__(self, secret: bytes = SECRET_KEY):
        self.secret = secret

    def _sign_payload(self, raw_str: str) -> str:
        return hmac.new(self.secret, raw_str.encode("utf-8"), hashlib.sha256).hexdigest()

    async def issue_token(
        self,
        plan_id: str,
        task_id: str,
        target_agent_id: str,
        permitted_operations: List[str],
        approved_parameters: Dict[str, Any],
        plan_hash: str,
        ttl_seconds: int = 300,
    ) -> Dict[str, Any]:
        token_id = f"tok-{uuid.uuid4().hex[:12]}"
        nonce = uuid.uuid4().hex
        now = datetime.datetime.now(datetime.timezone.utc)
        expires_at = (now + datetime.timedelta(seconds=ttl_seconds)).isoformat()

        sorted_ops = sorted(permitted_operations)
        param_hash = hashlib.sha256(json.dumps(approved_parameters, sort_keys=True).encode("utf-8")).hexdigest()

        sign_base = f"{token_id}:{task_id}:{target_agent_id}:{json.dumps(sorted_ops)}:{param_hash}:{plan_hash}:{nonce}:{expires_at}"
        signature = self._sign_payload(sign_base)

        token_record = {
            "token_id": token_id,
            "plan_id": plan_id,
            "task_id": task_id,
            "target_agent_id": target_agent_id,
            "permitted_operations": sorted_ops,
            "approved_parameters_hash": param_hash,
            "plan_hash": plan_hash,
            "nonce": nonce,
            "expires_at": expires_at,
            "hmac_signature": signature,
            "used": False,
            "revoked": False,
            "created_at": now.isoformat(),
        }

        async with get_db_connection() as conn:
            await conn.execute(
                """
                INSERT INTO permission_tokens (
                    token_id, plan_id, task_id, target_agent_id, permitted_operations,
                    approved_parameters_hash, plan_hash, nonce, expires_at, hmac_signature,
                    used, revoked, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
                """,
                (
                    token_id,
                    plan_id,
                    task_id,
                    target_agent_id,
                    json.dumps(sorted_ops),
                    param_hash,
                    plan_hash,
                    nonce,
                    expires_at,
                    signature,
                    now.isoformat(),
                ),
            )
            await conn.commit()

        return token_record

    async def verify_and_consume(
        self,
        token_id: str,
        plan_id: str,
        target_agent_id: str,
        operation: str,
        parameters: Dict[str, Any],
        plan_hash: str,
    ) -> bool:
        """
        Validates token integrity, expiry, single-use nonce, and permission scope.
        Marks token as consumed upon success. Raises ValueError on any violation.
        """
        async with get_db_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM permission_tokens WHERE token_id = ?", (token_id,)
            )
            row = await cursor.fetchone()
            if not row:
                raise ValueError(f"Permission token '{token_id}' not found.")

            # 1. Single-use check
            if row["used"]:
                raise ValueError(f"Token '{token_id}' has already been consumed (single-use violation).")

            # 2. Revocation check
            if row["revoked"]:
                raise ValueError(f"Token '{token_id}' has been revoked.")

            # 3. Expiry check
            now = datetime.datetime.now(datetime.timezone.utc)
            exp = datetime.datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
            if now > exp:
                raise ValueError(f"Token '{token_id}' has expired.")

            # 4. Plan & Hash binding check
            if row["plan_id"] != plan_id or row["plan_hash"] != plan_hash:
                raise ValueError(f"Token '{token_id}' plan hash mismatch (unauthorized plan binding).")

            # 5. Target agent check
            if row["target_agent_id"] != target_agent_id:
                raise ValueError(f"Token '{token_id}' target agent mismatch.")

            # 6. Operation allow-list check
            permitted_ops = json.loads(row["permitted_operations"])
            if operation not in permitted_ops:
                raise ValueError(f"Operation '{operation}' is outside the token permitted allow-list: {permitted_ops}.")

            # 7. HMAC cryptographic integrity check
            param_hash = hashlib.sha256(json.dumps(parameters, sort_keys=True).encode("utf-8")).hexdigest()
            sign_base = (
                f"{row['token_id']}:{row['task_id']}:{row['target_agent_id']}:"
                f"{json.dumps(sorted(permitted_ops))}:{param_hash}:{row['plan_hash']}:"
                f"{row['nonce']}:{row['expires_at']}"
            )
            expected_sig = self._sign_payload(sign_base)
            if not hmac.compare_digest(expected_sig, row["hmac_signature"]):
                raise ValueError("Cryptographic HMAC signature verification failed.")

            # Mark token as used
            await conn.execute(
                "UPDATE permission_tokens SET used = 1 WHERE token_id = ?", (token_id,)
            )
            await conn.commit()

        return True


permission_broker = PermissionBroker()

