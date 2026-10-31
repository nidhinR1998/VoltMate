"""
VoltMate Enterprise IBM MDM + Kimball Data Warehouse SQLAlchemy 2.0 Models
Mapped across 4 PostgreSQL Schemas:
  1. ref_mdm  (Master Reference Domains, Codes & Decoupled Text Translations)
  2. mdm_core (IBM MDM Golden Entities, Separate Narrative Text Store, KV & SCD Type 4 Audit)
  3. dw_dim   (Kimball Slowly Changing Dimensions — SCD Type 2)
  4. dw_fact  (Pure Numeric & Surrogate-Key Fact Tables)
"""

import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from sqlalchemy import (
    SmallInteger,
    Integer,
    BigInteger,
    String,
    CHAR,
    Text,
    Numeric,
    Date,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base


# =============================================================================
# SCHEMA 1: ref_mdm (Master Reference Codes & Decoupled Text Tables)
# =============================================================================

class CdDomain(Base):
    __tablename__ = "cd_domain"
    __table_args__ = {"schema": "ref_mdm"}

    domain_cd: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    domain_mnemonic: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)


class CdReferenceValue(Base):
    __tablename__ = "cd_reference_value"
    __table_args__ = {"schema": "ref_mdm"}

    ref_cd: Mapped[int] = mapped_column(Integer, primary_key=True)
    domain_cd: Mapped[int] = mapped_column(
        SmallInteger, ForeignKey("ref_mdm.cd_domain.domain_cd"), nullable=False
    )
    std_code: Mapped[str] = mapped_column(String(24), unique=True, nullable=False)
    sort_seq: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    active_ind: Mapped[str] = mapped_column(CHAR(1), nullable=False, default="Y")


class TxtReferenceLabel(Base):
    __tablename__ = "txt_reference_label"
    __table_args__ = (
        UniqueConstraint("ref_cd", "lang_cd", name="ux_txt_ref_label_lang"),
        {"schema": "ref_mdm"},
    )

    txt_label_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    ref_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd", ondelete="CASCADE"), nullable=False
    )
    lang_cd: Mapped[str] = mapped_column(CHAR(2), nullable=False, default="EN")
    short_label_txt: Mapped[str] = mapped_column(String(40), nullable=False)
    medium_label_txt: Mapped[str] = mapped_column(String(100), nullable=False)
    long_desc_txt: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)


# =============================================================================
# SCHEMA 2: mdm_core (IBM MDM Golden Entities, Separate Text Store, KV & SCD4)
# =============================================================================

class MdmParty(Base):
    __tablename__ = "mdm_party"
    __table_args__ = {"schema": "mdm_core"}

    party_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    party_type_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=False
    )
    party_stat_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=False
    )
    kyc_verif_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=False
    )
    pref_map_style_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=False
    )
    trust_score_num: Mapped[Decimal] = mapped_column(
        Numeric(3, 2), nullable=False, default=Decimal("5.00")
    )
    created_ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class MdmPartyCredential(Base):
    __tablename__ = "mdm_party_credential"
    __table_args__ = {"schema": "mdm_core"}

    party_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("mdm_core.mdm_party.party_id", ondelete="CASCADE"),
        primary_key=True,
    )
    email_addr: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    phone_e164: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    pwd_hash_argon2: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    upi_vpa_addr: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    version_num: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class MdmPartyHistScd4(Base):
    __tablename__ = "mdm_party_hist_scd4"
    __table_args__ = {"schema": "mdm_core"}

    hist_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    party_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    party_type_cd: Mapped[int] = mapped_column(Integer, nullable=False)
    kyc_verif_cd: Mapped[int] = mapped_column(Integer, nullable=False)
    phone_e164: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    upi_vpa_addr: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    trust_score_num: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 2), nullable=True)
    eff_from_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    eff_to_ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    dml_action_cd: Mapped[str] = mapped_column(CHAR(1), nullable=False)


class MdmChargingNode(Base):
    __tablename__ = "mdm_charging_node"
    __table_args__ = {"schema": "mdm_core"}

    node_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    host_party_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("mdm_core.mdm_party.party_id"), nullable=False
    )
    node_cat_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=False
    )
    discom_board_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=False
    )
    oper_stat_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=False
    )
    pincode_num: Mapped[int] = mapped_column(Integer, nullable=False)
    rating_avg_num: Mapped[Decimal] = mapped_column(
        Numeric(3, 2), nullable=False, default=Decimal("4.80")
    )
    review_cnt_num: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class TxtEntityNarrative(Base):
    __tablename__ = "txt_entity_narrative"
    __table_args__ = (
        UniqueConstraint("entity_uuid", "narrative_type_cd", "lang_cd", name="ux_txt_entity_narrative"),
        {"schema": "mdm_core"},
    )

    narrative_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    entity_uuid: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    narrative_type_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=False
    )
    lang_cd: Mapped[str] = mapped_column(CHAR(2), nullable=False, default="EN")
    narrative_txt: Mapped[str] = mapped_column(Text, nullable=False)


class KvEntityAttribute(Base):
    __tablename__ = "kv_entity_attribute"
    __table_args__ = (
        UniqueConstraint("entity_uuid", "attr_key_cd", name="ux_kv_entity_attr"),
        {"schema": "mdm_core"},
    )

    kv_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    entity_uuid: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    attr_key_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=False
    )
    val_code_cd: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=True
    )
    val_num: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4), nullable=True)
    val_short_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    updated_ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


# =============================================================================
# SCHEMA 3: dw_dim (Kimball Slowly Changing Dimensions — SCD Type 2)
# =============================================================================

class DimDate(Base):
    __tablename__ = "dim_date"
    __table_args__ = {"schema": "dw_dim"}

    date_sk: Mapped[int] = mapped_column(Integer, primary_key=True)
    calendar_date: Mapped[date] = mapped_column(Date, unique=True, nullable=False)
    day_of_week_num: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    is_weekend_ind: Mapped[str] = mapped_column(CHAR(1), nullable=False)
    month_num: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    year_num: Mapped[int] = mapped_column(SmallInteger, nullable=False)


class DimNodeTariffScd2(Base):
    __tablename__ = "dim_node_tariff_scd2"
    __table_args__ = {"schema": "dw_dim"}

    tariff_sk: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    node_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("mdm_core.mdm_charging_node.node_id"), nullable=False
    )
    conn_type_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=False
    )
    rated_power_kw: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    discom_board_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=False
    )
    energy_rate_inr: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    parking_rate_hr_inr: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    eff_start_ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    eff_end_ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    curr_row_ind: Mapped[str] = mapped_column(CHAR(1), nullable=False, default="Y")
    version_num: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class DimVehicleScd2(Base):
    __tablename__ = "dim_vehicle_scd2"
    __table_args__ = {"schema": "dw_dim"}

    vehicle_sk: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    owner_party_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("mdm_core.mdm_party.party_id"), nullable=False
    )
    veh_cat_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=False
    )
    veh_model_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=False
    )
    prim_conn_type_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=False
    )
    battery_cap_kwh: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    max_ac_kw: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    is_primary_ind: Mapped[str] = mapped_column(CHAR(1), nullable=False, default="N")
    eff_start_ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    eff_end_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    curr_row_ind: Mapped[str] = mapped_column(CHAR(1), nullable=False, default="Y")
    version_num: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class DimPartyScd2(Base):
    __tablename__ = "dim_party_scd2"
    __table_args__ = {"schema": "dw_dim"}

    party_sk: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    party_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("mdm_core.mdm_party.party_id"), nullable=False
    )
    party_type_cd: Mapped[int] = mapped_column(Integer, nullable=False)
    kyc_verif_cd: Mapped[int] = mapped_column(Integer, nullable=False)
    trust_score_band_cd: Mapped[int] = mapped_column(Integer, nullable=False)
    eff_start_ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    eff_end_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    curr_row_ind: Mapped[str] = mapped_column(CHAR(1), nullable=False, default="Y")
    version_num: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


# =============================================================================
# SCHEMA 4: dw_fact (Pure Numeric & Surrogate-Key Fact Tables)
# =============================================================================

class FactChargingSession(Base):
    __tablename__ = "fact_charging_session"
    __table_args__ = {"schema": "dw_fact"}

    session_fact_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    booking_natural_uuid: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4
    )
    date_sk: Mapped[int] = mapped_column(
        Integer, ForeignKey("dw_dim.dim_date.date_sk"), nullable=False
    )
    driver_party_sk: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("dw_dim.dim_party_scd2.party_sk"), nullable=False
    )
    host_party_sk: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("dw_dim.dim_party_scd2.party_sk"), nullable=False
    )
    vehicle_sk: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("dw_dim.dim_vehicle_scd2.vehicle_sk"), nullable=False
    )
    tariff_sk: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("dw_dim.dim_node_tariff_scd2.tariff_sk"), nullable=False
    )
    session_stat_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=False
    )
    gate_pass_pin_num: Mapped[int] = mapped_column(Integer, nullable=False)
    sched_start_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sched_end_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actual_start_ts: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_end_ts: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    start_soc_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    end_soc_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    delivered_kwh: Mapped[Decimal] = mapped_column(
        Numeric(8, 3), nullable=False, default=Decimal("0.000")
    )
    charging_duration_sec: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    energy_cost_inr: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    parking_cost_inr: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    total_settled_inr: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )


class FactWalletLedger(Base):
    __tablename__ = "fact_wallet_ledger"
    __table_args__ = {"schema": "dw_fact"}

    ledger_fact_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    txn_natural_uuid: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4
    )
    date_sk: Mapped[int] = mapped_column(
        Integer, ForeignKey("dw_dim.dim_date.date_sk"), nullable=False
    )
    party_sk: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("dw_dim.dim_party_scd2.party_sk"), nullable=False
    )
    session_fact_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("dw_fact.fact_charging_session.session_fact_id"), nullable=True
    )
    txn_type_cd: Mapped[int] = mapped_column(
        Integer, ForeignKey("ref_mdm.cd_reference_value.ref_cd"), nullable=False
    )
    dr_cr_ind: Mapped[str] = mapped_column(CHAR(1), nullable=False)
    txn_amt_inr: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    running_bal_inr: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    created_ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

