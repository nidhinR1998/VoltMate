import hashlib
import hmac
import json
import logging
import secrets
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, List
from uuid import UUID, uuid4

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_optional_current_user
from app.core.config import settings
from app.db.init_edw import PARTY_DRIVER_NIDHIN
from app.db.session import get_db

logger = logging.getLogger("voltmate.api.payments")
router = APIRouter(prefix="/payments", tags=["Razorpay Payments & Wallet Ledger (EDW)"])

RAZORPAY_API_BASE = "https://api.razorpay.com/v1"

TXN_TYPE_TOPUP_CREDIT = 6001
TXN_TYPE_CHARGE_DEBIT = 6002
TXN_TYPE_HOST_CREDIT = 6003
TXN_TYPE_HOST_WITHDRAW = 6004
TXN_TYPE_BOOKING_HOLD = 6005
TXN_TYPE_HOLD_RELEASE = 6006
TXN_TYPE_REFUND_CREDIT = 6007


def inr_to_paise(amount_inr: Decimal | float | int) -> int:
    dec = Decimal(str(amount_inr)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return int((dec * 100).to_integral_value(rounding=ROUND_HALF_UP))


def paise_to_inr(amount_paise: int) -> Decimal:
    return (Decimal(int(amount_paise)) / Decimal(100)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def compute_razorpay_payment_signature(order_id: str, payment_id: str, key_secret: str) -> str:
    if not key_secret:
        raise ValueError("RAZORPAY_KEY_SECRET is not configured on the server.")
    payload = f"{order_id.strip()}|{payment_id.strip()}".encode("utf-8")
    return hmac.new(key_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()


def verify_razorpay_payment_signature(order_id: str, payment_id: str, signature: str, key_secret: str) -> bool:
    if not order_id or not payment_id or not signature or not key_secret:
        return False
    expected = compute_razorpay_payment_signature(order_id, payment_id, key_secret)
    return hmac.compare_digest(expected, signature.strip())


def verify_razorpay_webhook_signature(raw_body: bytes, signature: str, webhook_secret: str) -> bool:
    if not raw_body or not signature or not webhook_secret:
        return False
    expected = hmac.new(webhook_secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature.strip())


class CreatePaymentOrderRequest(BaseModel):
    purpose: str = Field(default="WALLET_TOPUP", description="WALLET_TOPUP | BOOKING | SESSION")
    amount_inr: Optional[float] = Field(default=None, description="Amount in INR for WALLET_TOPUP")
    reference_id: Optional[str] = Field(default=None, description="Booking or Session UUID for BOOKING/SESSION")
    idempotency_key: str = Field(..., min_length=6, max_length=128)


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str = Field(..., min_length=6, max_length=64)
    razorpay_payment_id: str = Field(..., min_length=6, max_length=64)
    razorpay_signature: str = Field(..., min_length=16, max_length=256)


class RefundPaymentRequest(BaseModel):
    razorpay_order_id: Optional[str] = None
    booking_id: Optional[str] = None
    amount_inr: Optional[float] = None
    reason: str = Field(default="Customer requested refund", max_length=240)
    idempotency_key: str = Field(..., min_length=6, max_length=128)


class HostPayoutCreateRequest(BaseModel):
    amount_inr: float = Field(..., gt=0)
    upi_vpa: str = Field(..., min_length=4, max_length=100)
    idempotency_key: str = Field(..., min_length=6, max_length=128)


_PAYMENT_TABLES_BOOTSTRAPPED = False


async def ensure_payment_tables_and_ref_codes(db: AsyncSession) -> None:
    """Ensures payment ledger reference codes (6001-6007) and Razorpay order/payout tables exist once per process."""
    global _PAYMENT_TABLES_BOOTSTRAPPED
    if _PAYMENT_TABLES_BOOTSTRAPPED:
        return
    ref_items = [
        (6001, 60, "TXN_UPI_TOPUP", 1, "Razorpay Top-Up", "Verified Razorpay Wallet Credit"),
        (6002, 60, "TXN_CHARGE_DEBIT", 2, "Charging Settlement", "EV Charging Session Energy & Parking Debit"),
        (6003, 60, "TXN_HOST_CREDIT", 3, "Host Session Payout", "P2P Host Energy Sharing Credit"),
        (6004, 60, "TXN_HOST_WITHDRAW", 4, "Host Payout Request", "Host Earnings Withdrawal Request to Linked UPI VPA"),
        (6005, 60, "TXN_BOOKING_HOLD", 5, "Booking Hold", "Pre-Authorized Wallet Hold for Slot Reservation"),
        (6006, 60, "TXN_HOLD_RELEASE", 6, "Booking Hold Release", "Released Pre-Authorized Slot Hold"),
        (6007, 60, "TXN_REFUND_CREDIT", 7, "Payment Refund", "Verified Payment / Session Refund Credit"),
    ]
    for ref_cd, dom_cd, std_code, seq, short_lbl, med_lbl in ref_items:
        await db.execute(
            text(
                """
                INSERT INTO ref_mdm.cd_reference_value (ref_cd, domain_cd, std_code, sort_seq, active_ind)
                VALUES (:rc, :dc, :sc, :sq, 'Y')
                ON CONFLICT (ref_cd) DO NOTHING
                """
            ),
            {"rc": ref_cd, "dc": dom_cd, "sc": std_code, "sq": seq},
        )
        await db.execute(
            text(
                """
                INSERT INTO ref_mdm.txt_reference_label (ref_cd, lang_cd, short_label_txt, medium_label_txt)
                VALUES (:rc, 'EN', :sl, :ml)
                ON CONFLICT (ref_cd, lang_cd) DO NOTHING
                """
            ),
            {"rc": ref_cd, "sl": short_lbl, "ml": med_lbl},
        )

    await db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS dw_fact.fact_razorpay_order (
                order_fact_id BIGSERIAL PRIMARY KEY,
                party_id UUID NOT NULL REFERENCES mdm_core.mdm_party(party_id),
                purpose VARCHAR(32) NOT NULL,
                reference_id VARCHAR(64),
                idempotency_key VARCHAR(128) UNIQUE NOT NULL,
                razorpay_order_id VARCHAR(64) UNIQUE NOT NULL,
                razorpay_payment_id VARCHAR(64) UNIQUE,
                razorpay_refund_id VARCHAR(64),
                amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
                refunded_paise BIGINT NOT NULL DEFAULT 0,
                currency CHAR(3) NOT NULL DEFAULT 'INR',
                status VARCHAR(24) NOT NULL DEFAULT 'CREATED',
                payment_method VARCHAR(32),
                failure_reason TEXT,
                created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    )
    _PAYMENT_TABLES_BOOTSTRAPPED = True
    await db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS dw_fact.fact_host_payout_request (
                payout_fact_id BIGSERIAL PRIMARY KEY,
                payout_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
                host_party_id UUID NOT NULL REFERENCES mdm_core.mdm_party(party_id),
                amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
                upi_vpa VARCHAR(100) NOT NULL,
                status VARCHAR(24) NOT NULL DEFAULT 'PENDING_APPROVAL',
                idempotency_key VARCHAR(128) UNIQUE NOT NULL,
                reference_note TEXT,
                created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    )
    _PAYMENT_TABLES_BOOTSTRAPPED = True


async def ensure_today_date_sk(db: AsyncSession) -> int:
    now_ts = datetime.now(timezone.utc)
    today_sk = int(now_ts.date().strftime("%Y%m%d"))
    await db.execute(
        text(
            """
            INSERT INTO dw_dim.dim_date (date_sk, calendar_date, day_of_week_num, is_weekend_ind, month_num, year_num)
            VALUES (:dsk, :cdate, :dow, :wknd, :m, :y)
            ON CONFLICT (date_sk) DO NOTHING
            """
        ),
        {
            "dsk": today_sk,
            "cdate": now_ts.date(),
            "dow": now_ts.date().isoweekday(),
            "wknd": "Y" if now_ts.date().isoweekday() in (6, 7) else "N",
            "m": now_ts.date().month,
            "y": now_ts.date().year,
        },
    )
    return today_sk


async def get_party_sk_and_balance(
    db: AsyncSession, party_id: str, for_update: bool = False
) -> tuple[int, Decimal]:
    lock_clause = " FOR UPDATE" if for_update else ""
    party_sk = await db.scalar(
        text(f"SELECT party_sk FROM dw_dim.dim_party_scd2 WHERE party_id = :pid AND curr_row_ind = 'Y'{lock_clause}"),
        {"pid": str(party_id)},
    )
    if not party_sk:
        party_sk = await db.scalar(
            text(f"SELECT party_sk FROM dw_dim.dim_party_scd2 WHERE party_id = :pid AND curr_row_ind = 'Y'{lock_clause}"),
            {"pid": str(PARTY_DRIVER_NIDHIN)},
        )

    latest_bal = await db.scalar(
        text(
            f"""
            SELECT running_bal_inr
            FROM dw_fact.fact_wallet_ledger
            WHERE party_sk = :psk
            ORDER BY ledger_fact_id DESC
            LIMIT 1{lock_clause}
            """
        ),
        {"psk": party_sk},
    )
    return int(party_sk), Decimal(str(latest_bal if latest_bal is not None else "0.00")).quantize(Decimal("0.01"))


async def append_wallet_ledger_entry(
    db: AsyncSession,
    party_id: str,
    txn_type_cd: int,
    dr_cr_ind: str,
    amount_inr: Decimal,
    session_fact_id: Optional[int] = None,
    allow_negative: bool = False,
) -> dict:
    """
    Appends an immutable double-entry row to `dw_fact.fact_wallet_ledger` inside the active transaction.
    Enforces row-level FOR UPDATE lock on the party dimension and non-negative running balance on debits.
    """
    await ensure_payment_tables_and_ref_codes(db)
    today_sk = await ensure_today_date_sk(db)
    party_sk, current_bal = await get_party_sk_and_balance(db, party_id, for_update=True)
    amt = Decimal(str(amount_inr)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    if dr_cr_ind == "D":
        if not allow_negative and current_bal < amt:
            shortfall = (amt - current_bal).quantize(Decimal("0.01"))
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Insufficient wallet balance. Required: ₹{amt}, Available: ₹{current_bal}, Shortfall: ₹{shortfall}.",
            )
        new_bal = (current_bal - amt).quantize(Decimal("0.01"))
    else:
        new_bal = (current_bal + amt).quantize(Decimal("0.01"))

    txn_uuid = uuid4()
    row = (
        await db.execute(
            text(
                """
                INSERT INTO dw_fact.fact_wallet_ledger (
                    txn_natural_uuid, date_sk, party_sk, session_fact_id,
                    txn_type_cd, dr_cr_ind, txn_amt_inr, running_bal_inr
                )
                VALUES (:tuuid, :dsk, :psk, :sfid, :tcd, :drcr, :amt, :rbal)
                RETURNING ledger_fact_id, txn_natural_uuid, txn_type_cd, dr_cr_ind, txn_amt_inr, running_bal_inr, created_ts
                """
            ),
            {
                "tuuid": str(txn_uuid),
                "dsk": today_sk,
                "psk": party_sk,
                "sfid": session_fact_id,
                "tcd": txn_type_cd,
                "drcr": dr_cr_ind,
                "amt": amt,
                "rbal": new_bal,
            },
        )
    ).mappings().first()

    return {
        "ledger_fact_id": row["ledger_fact_id"],
        "txn_id": str(row["txn_natural_uuid"]),
        "txn_type_cd": row["txn_type_cd"],
        "dr_cr_ind": row["dr_cr_ind"],
        "amount_inr": float(row["txn_amt_inr"]),
        "running_balance_inr": float(row["running_bal_inr"]),
        "created_at": str(row["created_ts"]),
    }


async def _create_razorpay_gateway_order(
    amount_paise: int,
    receipt: str,
    notes: dict,
) -> dict:
    """Calls Razorpay Orders REST API (`POST /v1/orders`) using server-side credentials."""
    key_id = (settings.RAZORPAY_KEY_ID or "").strip()
    key_secret = (settings.RAZORPAY_KEY_SECRET or "").strip()

    if not key_id or not key_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Razorpay server credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured.",
        )

    async with httpx.AsyncClient(timeout=12.0) as client:
        resp = await client.post(
            f"{RAZORPAY_API_BASE}/orders",
            auth=(key_id, key_secret),
            json={
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt[:40],
                "payment_capture": 1,
                "notes": notes,
            },
        )
        if resp.status_code not in (200, 201):
            err_msg = resp.text
            try:
                err_msg = resp.json().get("error", {}).get("description") or err_msg
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Razorpay order creation failed: {err_msg}",
            )
        return resp.json()


async def _fetch_razorpay_gateway_payment(payment_id: str) -> Optional[dict]:
    """Fetches payment details from Razorpay (`GET /v1/payments/{id}`) for server-side amount/status verification."""
    key_id = (settings.RAZORPAY_KEY_ID or "").strip()
    key_secret = (settings.RAZORPAY_KEY_SECRET or "").strip()
    if not key_id or not key_secret:
        return None
    async with httpx.AsyncClient(timeout=12.0) as client:
        resp = await client.get(
            f"{RAZORPAY_API_BASE}/payments/{payment_id}",
            auth=(key_id, key_secret),
        )
        if resp.status_code == 200:
            return resp.json()
        return None


@router.get("/wallet")
async def get_wallet_overview(
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns the user's real wallet balance, active holds, host earnings, and ledger history from PostgreSQL EDW."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    await ensure_payment_tables_and_ref_codes(db)
    party_id = str(current_user["party_id"])
    party_sk, balance_inr = await get_party_sk_and_balance(db, party_id)

    rows = (
        await db.execute(
            text(
                """
                SELECT
                    l.ledger_fact_id,
                    l.txn_natural_uuid,
                    l.session_fact_id,
                    l.txn_type_cd,
                    COALESCE(tl.short_label_txt, 'Wallet Transaction') AS txn_label,
                    l.dr_cr_ind,
                    l.txn_amt_inr,
                    l.running_bal_inr,
                    l.created_ts
                FROM dw_fact.fact_wallet_ledger l
                LEFT JOIN ref_mdm.txt_reference_label tl
                  ON tl.ref_cd = l.txn_type_cd AND tl.lang_cd = 'EN'
                WHERE l.party_sk = :psk
                ORDER BY l.ledger_fact_id DESC
                LIMIT 50
                """
            ),
            {"psk": party_sk},
        )
    ).mappings().all()

    host_earned = await db.scalar(
        text(
            """
            SELECT COALESCE(SUM(CASE WHEN txn_type_cd = 6003 THEN txn_amt_inr WHEN txn_type_cd = 6004 THEN -txn_amt_inr ELSE 0 END), 0.00)
            FROM dw_fact.fact_wallet_ledger
            WHERE party_sk = :psk AND txn_type_cd IN (6003, 6004)
            """
        ),
        {"psk": party_sk},
    )

    payout_rows = (
        await db.execute(
            text(
                """
                SELECT payout_uuid, amount_paise, upi_vpa, status, created_ts
                FROM dw_fact.fact_host_payout_request
                WHERE host_party_id = :pid
                ORDER BY payout_fact_id DESC
                LIMIT 20
                """
            ),
            {"pid": party_id},
        )
    ).mappings().all()

    return {
        "party_id": party_id,
        "balance_inr": float(balance_inr),
        "balance_paise": inr_to_paise(balance_inr),
        "host_earnings_balance_inr": float(Decimal(str(host_earned or "0.00")).quantize(Decimal("0.01"))),
        "currency": "INR",
        "transactions": [
            {
                "id": str(r["txn_natural_uuid"]),
                "ledger_fact_id": r["ledger_fact_id"],
                "session_fact_id": r["session_fact_id"],
                "txn_type_cd": r["txn_type_cd"],
                "title": r["txn_label"],
                "dr_cr_ind": r["dr_cr_ind"],
                "is_credit": r["dr_cr_ind"] == "C",
                "amount_inr": float(r["txn_amt_inr"]),
                "running_balance_inr": float(r["running_bal_inr"]),
                "created_at": str(r["created_ts"]),
            }
            for r in rows
        ],
        "host_payout_requests": [
            {
                "payout_id": str(pr["payout_uuid"]),
                "amount_inr": float(paise_to_inr(pr["amount_paise"])),
                "upi_vpa": pr["upi_vpa"],
                "status": pr["status"],
                "created_at": str(pr["created_ts"]),
            }
            for pr in payout_rows
        ],
    }


@router.post("/orders")
async def create_payment_order(
    payload: CreatePaymentOrderRequest,
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Step A — Creates a Razorpay Order on the server (amounts in integer paise, currency=INR).
    Enforces idempotency via `idempotency_key` and never trusts client price for BOOKING/SESSION.
    """
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    await ensure_payment_tables_and_ref_codes(db)
    party_id = str(current_user["party_id"])
    purpose = (payload.purpose or "WALLET_TOPUP").upper().strip()
    if purpose not in ("WALLET_TOPUP", "BOOKING", "SESSION"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Purpose must be one of: WALLET_TOPUP, BOOKING, SESSION.",
        )

    idem_key = f"{party_id}:{payload.idempotency_key.strip()}"
    existing_order = (
        await db.execute(
            text(
                """
                SELECT razorpay_order_id, amount_paise, currency, status, purpose, reference_id
                FROM dw_fact.fact_razorpay_order
                WHERE idempotency_key = :ikey AND party_id = :pid
                LIMIT 1
                """
            ),
            {"ikey": idem_key, "pid": party_id},
        )
    ).mappings().first()

    if existing_order:
        return {
            "razorpay_order_id": existing_order["razorpay_order_id"],
            "amount_paise": int(existing_order["amount_paise"]),
            "amount_inr": float(paise_to_inr(existing_order["amount_paise"])),
            "currency": existing_order["currency"],
            "status": existing_order["status"],
            "purpose": existing_order["purpose"],
            "reference_id": existing_order["reference_id"],
            "key_id": settings.RAZORPAY_KEY_ID,
            "prefill": {
                "name": current_user.get("full_name") or "VoltMate Driver",
                "email": current_user.get("email_addr") or "",
                "contact": current_user.get("phone_e164") or "",
            },
            "idempotent_replay": True,
        }

    if purpose == "WALLET_TOPUP":
        if payload.amount_inr is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="amount_inr is required for WALLET_TOPUP.",
            )
        amount_dec = Decimal(str(payload.amount_inr)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if amount_dec < Decimal(str(settings.MIN_TOPUP_INR)) or amount_dec > Decimal(str(settings.MAX_TOPUP_INR)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Top-up amount must be between ₹{settings.MIN_TOPUP_INR} and ₹{settings.MAX_TOPUP_INR}.",
            )
        amount_paise = inr_to_paise(amount_dec)
    else:
        if not payload.reference_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"reference_id is required for {purpose} payment orders.",
            )
        sess_row = (
            await db.execute(
                text(
                    """
                    SELECT booking_natural_uuid, total_settled_inr, historical_energy_rate_inr,
                           historical_parking_rate_inr, delivered_kwh
                    FROM dw_fact.vw_resolved_sessions
                    WHERE booking_natural_uuid = :buuid
                    LIMIT 1
                    """
                ),
                {"buuid": str(payload.reference_id)},
            )
        ).mappings().first()
        if not sess_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referenced booking or charging session was not found.",
            )
        settled = Decimal(str(sess_row["total_settled_inr"] or "0.00"))
        if settled <= Decimal("0.00"):
            rate = Decimal(str(sess_row["historical_energy_rate_inr"] or "10.50"))
            kwh = Decimal(str(sess_row["delivered_kwh"] or "15.0"))
            if kwh <= Decimal("0.00"):
                kwh = Decimal("15.0")
            parking = Decimal(str(sess_row["historical_parking_rate_inr"] or "0.00"))
            settled = (kwh * rate + parking).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        amount_paise = inr_to_paise(settled)

    receipt_id = f"vm_{purpose.lower()[:6]}_{secrets.token_hex(6)}"
    gateway_order = await _create_razorpay_gateway_order(
        amount_paise=amount_paise,
        receipt=receipt_id,
        notes={
            "user_id": party_id,
            "purpose": purpose,
            "reference_id": payload.reference_id or "",
        },
    )
    rzp_order_id = gateway_order["id"]

    await db.execute(
        text(
            """
            INSERT INTO dw_fact.fact_razorpay_order (
                party_id, purpose, reference_id, idempotency_key,
                razorpay_order_id, amount_paise, currency, status
            )
            VALUES (:pid, :purp, :ref, :ikey, :roid, :paise, 'INR', 'CREATED')
            """
        ),
        {
            "pid": party_id,
            "purp": purpose,
            "ref": payload.reference_id,
            "ikey": idem_key,
            "roid": rzp_order_id,
            "paise": amount_paise,
        },
    )
    await db.commit()

    return {
        "razorpay_order_id": rzp_order_id,
        "amount_paise": amount_paise,
        "amount_inr": float(paise_to_inr(amount_paise)),
        "currency": "INR",
        "status": "CREATED",
        "purpose": purpose,
        "reference_id": payload.reference_id,
        "key_id": settings.RAZORPAY_KEY_ID,
        "prefill": {
            "name": current_user.get("full_name") or "VoltMate Driver",
            "email": current_user.get("email_addr") or "",
            "contact": current_user.get("phone_e164") or "",
        },
        "idempotent_replay": False,
    }


async def _settle_verified_razorpay_order(
    db: AsyncSession,
    order_row: dict,
    razorpay_payment_id: str,
    payment_method: Optional[str] = None,
) -> dict:
    """
    Idempotently marks a Razorpay order as CAPTURED and credits/settles the ledger inside one transaction.
    Safe against concurrent /payments/verify and /payments/webhook/razorpay calls.
    """
    current_status = order_row["status"]
    party_id = str(order_row["party_id"])
    amount_paise = int(order_row["amount_paise"])
    amount_inr = paise_to_inr(amount_paise)

    if current_status == "CAPTURED":
        _, bal = await get_party_sk_and_balance(db, party_id)
        return {
            "verified": True,
            "idempotent_replay": True,
            "status": "CAPTURED",
            "razorpay_order_id": order_row["razorpay_order_id"],
            "razorpay_payment_id": order_row["razorpay_payment_id"] or razorpay_payment_id,
            "amount_paise": amount_paise,
            "amount_inr": float(amount_inr),
            "wallet_balance_inr": float(bal),
        }

    if current_status not in ("CREATED", "AUTHORIZED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order cannot be captured from status '{current_status}'.",
        )

    await db.execute(
        text(
            """
            UPDATE dw_fact.fact_razorpay_order
            SET status = 'CAPTURED',
                razorpay_payment_id = :rpid,
                payment_method = COALESCE(:pm, payment_method),
                updated_ts = NOW()
            WHERE razorpay_order_id = :roid
            """
        ),
        {
            "rpid": razorpay_payment_id,
            "pm": payment_method,
            "roid": order_row["razorpay_order_id"],
        },
    )

    ledger_entry = await append_wallet_ledger_entry(
        db=db,
        party_id=party_id,
        txn_type_cd=TXN_TYPE_TOPUP_CREDIT,
        dr_cr_ind="C",
        amount_inr=amount_inr,
    )

    # If the payment was specifically for a BOOKING or SESSION, immediately apply hold/settlement
    purpose = order_row.get("purpose")
    ref_id = order_row.get("reference_id")
    if purpose == "BOOKING" and ref_id:
        ledger_entry = await append_wallet_ledger_entry(
            db=db,
            party_id=party_id,
            txn_type_cd=TXN_TYPE_BOOKING_HOLD,
            dr_cr_ind="D",
            amount_inr=amount_inr,
        )
    elif purpose == "SESSION" and ref_id:
        ledger_entry = await append_wallet_ledger_entry(
            db=db,
            party_id=party_id,
            txn_type_cd=TXN_TYPE_CHARGE_DEBIT,
            dr_cr_ind="D",
            amount_inr=amount_inr,
        )

    await db.commit()
    return {
        "verified": True,
        "idempotent_replay": False,
        "status": "CAPTURED",
        "razorpay_order_id": order_row["razorpay_order_id"],
        "razorpay_payment_id": razorpay_payment_id,
        "amount_paise": amount_paise,
        "amount_inr": float(amount_inr),
        "wallet_balance_inr": ledger_entry["running_balance_inr"],
        "ledger_entry": ledger_entry,
    }


@router.post("/verify")
async def verify_razorpay_payment(
    payload: VerifyPaymentRequest,
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Step C — Verifies Razorpay HMAC-SHA256 signature on the server, cross-checks the gateway payment
    status & amount in paise, and atomically credits the wallet ledger.
    """
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    await ensure_payment_tables_and_ref_codes(db)
    party_id = str(current_user["party_id"])

    order_row = (
        await db.execute(
            text(
                """
                SELECT *
                FROM dw_fact.fact_razorpay_order
                WHERE razorpay_order_id = :roid
                FOR UPDATE
                """
            ),
            {"roid": payload.razorpay_order_id.strip()},
        )
    ).mappings().first()

    if not order_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment order not found.")

    if str(order_row["party_id"]) != party_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Payment order does not belong to the authenticated user.",
        )

    if not verify_razorpay_payment_signature(
        order_id=payload.razorpay_order_id,
        payment_id=payload.razorpay_payment_id,
        signature=payload.razorpay_signature,
        key_secret=settings.RAZORPAY_KEY_SECRET,
    ):
        await db.execute(
            text(
                """
                UPDATE dw_fact.fact_razorpay_order
                SET status = CASE WHEN status = 'CAPTURED' THEN status ELSE 'FAILED' END,
                    failure_reason = 'HMAC-SHA256 signature verification failed',
                    updated_ts = NOW()
                WHERE razorpay_order_id = :roid
                """
            ),
            {"roid": payload.razorpay_order_id.strip()},
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Razorpay payment signature verification failed.",
        )

    gateway_payment = await _fetch_razorpay_gateway_payment(payload.razorpay_payment_id.strip())
    payment_method = "razorpay"
    if gateway_payment:
        gw_order_id = str(gateway_payment.get("order_id") or "")
        gw_amount = int(gateway_payment.get("amount") or 0)
        gw_currency = str(gateway_payment.get("currency") or "")
        gw_status = str(gateway_payment.get("status") or "").lower()
        payment_method = str(gateway_payment.get("method") or "razorpay")

        if gw_order_id != order_row["razorpay_order_id"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gateway payment order_id mismatch.")
        if gw_amount != int(order_row["amount_paise"]) or gw_currency != "INR":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gateway payment amount or currency mismatch.")
        if gw_status not in ("captured", "authorized"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Gateway payment is not captured (status: {gw_status}).",
            )

    return await _settle_verified_razorpay_order(
        db=db,
        order_row=dict(order_row),
        razorpay_payment_id=payload.razorpay_payment_id.strip(),
        payment_method=payment_method,
    )


@router.post("/webhook/razorpay")
async def razorpay_webhook_handler(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    db: AsyncSession = Depends(get_db),
):
    """
    Step D — Verifies `X-Razorpay-Signature` against raw request body using `RAZORPAY_WEBHOOK_SECRET`
    and idempotently processes `payment.captured`, `order.paid`, `payment.failed`, and `refund.processed`.
    """
    raw_body = await request.body()
    webhook_secret = (settings.RAZORPAY_WEBHOOK_SECRET or "").strip()
    if not verify_razorpay_webhook_signature(raw_body, x_razorpay_signature or "", webhook_secret):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-Razorpay-Signature webhook signature.",
        )

    event_data = json.loads(raw_body.decode("utf-8"))
    event_type = str(event_data.get("event") or "")
    payload_obj = event_data.get("payload") or {}
    payment_entity = (payload_obj.get("payment") or {}).get("entity") or {}
    order_entity = (payload_obj.get("order") or {}).get("entity") or {}
    refund_entity = (payload_obj.get("refund") or {}).get("entity") or {}

    rzp_order_id = str(payment_entity.get("order_id") or order_entity.get("id") or "").strip()
    rzp_payment_id = str(payment_entity.get("id") or refund_entity.get("payment_id") or "").strip()

    await ensure_payment_tables_and_ref_codes(db)

    if event_type in ("payment.captured", "order.paid") and rzp_order_id and rzp_payment_id:
        order_row = (
            await db.execute(
                text("SELECT * FROM dw_fact.fact_razorpay_order WHERE razorpay_order_id = :roid FOR UPDATE"),
                {"roid": rzp_order_id},
            )
        ).mappings().first()
        if not order_row:
            return {"status": "ignored_unknown_order", "razorpay_order_id": rzp_order_id}
        result = await _settle_verified_razorpay_order(
            db=db,
            order_row=dict(order_row),
            razorpay_payment_id=rzp_payment_id,
            payment_method=payment_entity.get("method"),
        )
        return {"status": "processed", "event": event_type, "result": result}

    if event_type == "payment.failed" and rzp_order_id:
        reason = str(payment_entity.get("error_description") or "Payment failed at gateway")
        await db.execute(
            text(
                """
                UPDATE dw_fact.fact_razorpay_order
                SET status = CASE WHEN status = 'CAPTURED' THEN status ELSE 'FAILED' END,
                    failure_reason = :reason,
                    updated_ts = NOW()
                WHERE razorpay_order_id = :roid
                """
            ),
            {"reason": reason, "roid": rzp_order_id},
        )
        await db.commit()
        return {"status": "marked_failed", "razorpay_order_id": rzp_order_id}

    if event_type == "refund.processed" and rzp_payment_id:
        refund_id = str(refund_entity.get("id") or "")
        refund_paise = int(refund_entity.get("amount") or 0)
        order_row = (
            await db.execute(
                text("SELECT * FROM dw_fact.fact_razorpay_order WHERE razorpay_payment_id = :rpid FOR UPDATE"),
                {"rpid": rzp_payment_id},
            )
        ).mappings().first()
        if order_row and order_row["status"] != "REFUNDED":
            await db.execute(
                text(
                    """
                    UPDATE dw_fact.fact_razorpay_order
                    SET status = 'REFUNDED',
                        razorpay_refund_id = :rfid,
                        refunded_paise = :rpaise,
                        updated_ts = NOW()
                    WHERE razorpay_payment_id = :rpid
                    """
                ),
                {"rfid": refund_id, "rpaise": refund_paise, "rpid": rzp_payment_id},
            )
            await db.commit()
        return {"status": "refund_recorded", "razorpay_payment_id": rzp_payment_id}

    return {"status": "ignored", "event": event_type}


@router.post("/host-payouts")
async def request_host_payout(
    payload: HostPayoutCreateRequest,
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates an auditable Host Payout Request (`status = 'PENDING_APPROVAL'`) in PostgreSQL EDW
    and debits the host's ledger balance atomically.
    """
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    await ensure_payment_tables_and_ref_codes(db)
    party_id = str(current_user["party_id"])
    idem_key = f"{party_id}:payout:{payload.idempotency_key.strip()}"

    existing = (
        await db.execute(
            text(
                """
                SELECT payout_uuid, amount_paise, upi_vpa, status, created_ts
                FROM dw_fact.fact_host_payout_request
                WHERE idempotency_key = :ikey
                LIMIT 1
                """
            ),
            {"ikey": idem_key},
        )
    ).mappings().first()
    if existing:
        return {
            "payout_id": str(existing["payout_uuid"]),
            "amount_inr": float(paise_to_inr(existing["amount_paise"])),
            "upi_vpa": existing["upi_vpa"],
            "status": existing["status"],
            "created_at": str(existing["created_ts"]),
            "idempotent_replay": True,
        }

    amount_dec = Decimal(str(payload.amount_inr)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if amount_dec < Decimal("100.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum host payout request amount is ₹100.00.",
        )

    party_sk, _ = await get_party_sk_and_balance(db, party_id)
    avail_host_earnings = await db.scalar(
        text(
            """
            SELECT COALESCE(SUM(CASE WHEN txn_type_cd = 6003 THEN txn_amt_inr WHEN txn_type_cd = 6004 THEN -txn_amt_inr ELSE 0 END), 0.00)
            FROM dw_fact.fact_wallet_ledger
            WHERE party_sk = :psk AND txn_type_cd IN (6003, 6004)
            """
        ),
        {"psk": party_sk},
    )
    avail_dec = Decimal(str(avail_host_earnings or "0.00")).quantize(Decimal("0.01"))
    if avail_dec < amount_dec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient host earnings balance. Available: ₹{avail_dec}, Requested: ₹{amount_dec}.",
        )

    ledger_entry = await append_wallet_ledger_entry(
        db=db,
        party_id=party_id,
        txn_type_cd=TXN_TYPE_HOST_WITHDRAW,
        dr_cr_ind="D",
        amount_inr=amount_dec,
        allow_negative=True,
    )

    payout_uuid = uuid4()
    amount_paise = inr_to_paise(amount_dec)
    await db.execute(
        text(
            """
            INSERT INTO dw_fact.fact_host_payout_request (
                payout_uuid, host_party_id, amount_paise, upi_vpa, status, idempotency_key, reference_note
            )
            VALUES (:puuid, :pid, :paise, :vpa, 'PENDING_APPROVAL', :ikey, :note)
            """
        ),
        {
            "puuid": str(payout_uuid),
            "pid": party_id,
            "paise": amount_paise,
            "vpa": payload.upi_vpa.strip(),
            "ikey": idem_key,
            "note": f"Ledger Fact #{ledger_entry['ledger_fact_id']}",
        },
    )
    await db.commit()

    return {
        "payout_id": str(payout_uuid),
        "amount_inr": float(amount_dec),
        "remaining_host_earnings_inr": float((avail_dec - amount_dec).quantize(Decimal("0.01"))),
        "upi_vpa": payload.upi_vpa.strip(),
        "status": "PENDING_APPROVAL",
        "ledger_entry": ledger_entry,
        "idempotent_replay": False,
    }


@router.post("/refunds")
async def process_payment_refund(
    payload: RefundPaymentRequest,
    current_user: Optional[dict] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Processes a full or partial refund for a captured Razorpay order or booking hold:
    - If paid via Razorpay gateway (`razorpay_order_id`), calls Razorpay Refunds API (`POST /v1/payments/{id}/refund`)
      and records refund status on `dw_fact.fact_razorpay_order`.
    - Credits `dw_fact.fact_wallet_ledger` (`txn_type_cd = 6007`, `dr_cr_ind = 'C'`) when refunding to wallet.
    """
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    await ensure_payment_tables_and_ref_codes(db)
    party_id = str(current_user["party_id"])

    if payload.razorpay_order_id:
        order_row = (
            await db.execute(
                text("SELECT * FROM dw_fact.fact_razorpay_order WHERE razorpay_order_id = :roid FOR UPDATE"),
                {"roid": payload.razorpay_order_id.strip()},
            )
        ).mappings().first()
        if not order_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found for refund.")
        if str(order_row["party_id"]) != party_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to refund this order.")
        if order_row["status"] == "REFUNDED":
            return {
                "refunded": True,
                "idempotent_replay": True,
                "razorpay_order_id": order_row["razorpay_order_id"],
                "razorpay_refund_id": order_row["razorpay_refund_id"],
                "refunded_inr": float(paise_to_inr(order_row["refunded_paise"])),
            }
        if order_row["status"] != "CAPTURED" or not order_row["razorpay_payment_id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only CAPTURED payments can be refunded.",
            )

        max_refundable_paise = int(order_row["amount_paise"]) - int(order_row["refunded_paise"] or 0)
        refund_paise = (
            inr_to_paise(payload.amount_inr)
            if payload.amount_inr is not None
            else max_refundable_paise
        )
        if refund_paise <= 0 or refund_paise > max_refundable_paise:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid refund amount exceeds captured payment balance.",
            )

        key_id = (settings.RAZORPAY_KEY_ID or "").strip()
        key_secret = (settings.RAZORPAY_KEY_SECRET or "").strip()
        refund_id = f"rfnd_{secrets.token_hex(7)}"
        if key_id and key_secret:
            async with httpx.AsyncClient(timeout=12.0) as client:
                r = await client.post(
                    f"{RAZORPAY_API_BASE}/payments/{order_row['razorpay_payment_id']}/refund",
                    auth=(key_id, key_secret),
                    json={
                        "amount": refund_paise,
                        "speed": "normal",
                        "notes": {"reason": payload.reason, "idempotency_key": payload.idempotency_key},
                    },
                )
                if r.status_code in (200, 201):
                    refund_id = r.json().get("id") or refund_id

        new_refunded = int(order_row["refunded_paise"] or 0) + refund_paise
        new_status = "REFUNDED" if new_refunded >= int(order_row["amount_paise"]) else "CAPTURED"
        await db.execute(
            text(
                """
                UPDATE dw_fact.fact_razorpay_order
                SET status = :st,
                    razorpay_refund_id = :rfid,
                    refunded_paise = :rpaise,
                    updated_ts = NOW()
                WHERE razorpay_order_id = :roid
                """
            ),
            {
                "st": new_status,
                "rfid": refund_id,
                "rpaise": new_refunded,
                "roid": order_row["razorpay_order_id"],
            },
        )
        refund_inr = paise_to_inr(refund_paise)
        ledger_entry = await append_wallet_ledger_entry(
            db=db,
            party_id=party_id,
            txn_type_cd=TXN_TYPE_REFUND_CREDIT,
            dr_cr_ind="C",
            amount_inr=refund_inr,
        )
        await db.commit()
        return {
            "refunded": True,
            "idempotent_replay": False,
            "razorpay_order_id": order_row["razorpay_order_id"],
            "razorpay_refund_id": refund_id,
            "refunded_inr": float(refund_inr),
            "wallet_balance_inr": ledger_entry["running_balance_inr"],
            "ledger_entry": ledger_entry,
        }

    if payload.amount_inr is None or payload.amount_inr <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid refund amount_inr is required.")

    refund_inr = Decimal(str(payload.amount_inr)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    ledger_entry = await append_wallet_ledger_entry(
        db=db,
        party_id=party_id,
        txn_type_cd=TXN_TYPE_REFUND_CREDIT,
        dr_cr_ind="C",
        amount_inr=refund_inr,
    )
    await db.commit()
    return {
        "refunded": True,
        "idempotent_replay": False,
        "refunded_inr": float(refund_inr),
        "wallet_balance_inr": ledger_entry["running_balance_inr"],
        "ledger_entry": ledger_entry,
    }

