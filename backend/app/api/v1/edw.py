import logging
from decimal import Decimal
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.init_edw import update_node_tariff_scd2

logger = logging.getLogger("voltmate.api.edw")
router = APIRouter(prefix="/edw", tags=["Enterprise IBM MDM + Kimball Data Warehouse"])


class Scd2TariffChangePayload(BaseModel):
    node_id: UUID
    conn_type_cd: int = 2001
    new_rate_inr: Decimal
    new_parking_rate_inr: Optional[Decimal] = None


@router.get("/catalog")
async def get_mdm_reference_catalog(
    domain_cd: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Queries `ref_mdm.cd_domain`, `ref_mdm.cd_reference_value`, and `ref_mdm.txt_reference_label`.
    """
    where_clause = "WHERE d.domain_cd = :dom" if domain_cd else ""
    params = {"dom": domain_cd} if domain_cd else {}
    rows = (
        await db.execute(
            text(
                f"""
                SELECT
                    d.domain_cd,
                    d.domain_mnemonic,
                    rv.ref_cd,
                    rv.std_code,
                    rv.sort_seq,
                    rv.active_ind,
                    tl.lang_cd,
                    tl.short_label_txt,
                    tl.medium_label_txt,
                    tl.long_desc_txt
                FROM ref_mdm.cd_reference_value rv
                JOIN ref_mdm.cd_domain d ON d.domain_cd = rv.domain_cd
                JOIN ref_mdm.txt_reference_label tl ON tl.ref_cd = rv.ref_cd AND tl.lang_cd = 'EN'
                {where_clause}
                ORDER BY d.domain_cd ASC, rv.sort_seq ASC, rv.ref_cd ASC
                """
            ),
            params,
        )
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/stations")
async def get_resolved_stations_view(db: AsyncSession = Depends(get_db)):
    """
    Queries `mdm_core.vw_resolved_stations` (`dw_dim.vw_station_catalog`).
    """
    rows = (
        await db.execute(text("SELECT * FROM mdm_core.vw_resolved_stations ORDER BY node_id ASC"))
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/sessions")
async def get_resolved_sessions_view(db: AsyncSession = Depends(get_db)):
    """
    Queries `dw_fact.vw_resolved_sessions` (`dw_fact.vw_session_details`).
    """
    rows = (
        await db.execute(text("SELECT * FROM dw_fact.vw_resolved_sessions ORDER BY session_fact_id DESC"))
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/vehicles")
async def get_resolved_vehicles_view(db: AsyncSession = Depends(get_db)):
    """
    Queries `dw_dim.vw_resolved_vehicles` (`dw_dim.dim_vehicle_scd2` + `ref_mdm` + `kv_entity_attribute`).
    """
    rows = (
        await db.execute(text("SELECT * FROM dw_dim.vw_resolved_vehicles ORDER BY vehicle_sk ASC"))
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/ledger")
async def get_wallet_ledger_facts(db: AsyncSession = Depends(get_db)):
    """
    Queries `dw_fact.fact_wallet_ledger` joined with `ref_mdm.txt_reference_label` and party names.
    """
    rows = (
        await db.execute(
            text(
                """
                SELECT
                    l.ledger_fact_id,
                    l.txn_natural_uuid,
                    l.date_sk,
                    l.party_sk,
                    p.party_id,
                    nar.narrative_txt AS party_full_name,
                    l.session_fact_id,
                    l.txn_type_cd,
                    tl.short_label_txt AS txn_type_label,
                    tl.medium_label_txt AS txn_type_desc,
                    l.dr_cr_ind,
                    l.txn_amt_inr,
                    l.running_bal_inr,
                    l.created_ts
                FROM dw_fact.fact_wallet_ledger l
                JOIN dw_dim.dim_party_scd2 p ON p.party_sk = l.party_sk
                JOIN ref_mdm.txt_reference_label tl ON tl.ref_cd = l.txn_type_cd AND tl.lang_cd = 'EN'
                LEFT JOIN mdm_core.txt_entity_narrative nar
                  ON nar.entity_uuid = p.party_id AND nar.narrative_type_cd = 8001 AND nar.lang_cd = 'EN'
                ORDER BY l.ledger_fact_id DESC
                """
            )
        )
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/party-audit-scd4")
async def get_party_scd4_audit_history(db: AsyncSession = Depends(get_db)):
    """
    Queries `mdm_core.mdm_party_hist_scd4` populated by PostgreSQL trigger `fn_trg_party_scd4_audit`.
    """
    rows = (
        await db.execute(
            text("SELECT * FROM mdm_core.mdm_party_hist_scd4 ORDER BY hist_id DESC")
        )
    ).mappings().all()
    return [dict(r) for r in rows]


@router.post("/tariff-scd2")
async def trigger_tariff_scd2_evolution(
    payload: Scd2TariffChangePayload,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await update_node_tariff_scd2(
            db=db,
            node_id=payload.node_id,
            conn_type_cd=payload.conn_type_cd,
            new_rate_inr=payload.new_rate_inr,
            new_parking_rate_inr=payload.new_parking_rate_inr,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

