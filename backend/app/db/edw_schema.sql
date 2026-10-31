-- =============================================================================
-- VOLTMATE ENTERPRISE IBM MDM + KIMBALL DATA WAREHOUSE DDL SPECIFICATION
-- Target Engine : PostgreSQL 16 / 18+ (Database: voltmate_edw)
-- Architecture  : 4-Schema Enterprise EDW (ref_mdm, mdm_core, dw_dim, dw_fact)
-- Rules Enforced:
--   Rule A: Zero descriptive text in Entity/Dim/Fact tables (CD_ & TXT_ split)
--   Rule B: Normalized Key-Value Attribute Extensibility (mdm_core.kv_entity_attribute)
--   Rule C: Hybrid SCD Type 2 (dw_dim.*_scd2) & SCD Type 4 (mdm_core.*_hist_scd4)
--   Rule D: Pure Numeric & Surrogate-Key Fact Tables (dw_fact.fact_*)
-- =============================================================================

-- 0. EXTENSIONS & SCHEMAS
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'postgis') THEN
        CREATE EXTENSION IF NOT EXISTS postgis;
    ELSE
        -- Native PostgreSQL 18 Geodesic Spatial Compatibility Layer (when PostGIS C binary is absent)
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'geography') THEN
            CREATE DOMAIN public.geography AS point;
        END IF;
    END IF;
END
$$;

-- Helper spatial functions when PostGIS C binary is not loaded
CREATE OR REPLACE FUNCTION public.vm_geog_from_lonlat(lon DOUBLE PRECISION, lat DOUBLE PRECISION)
RETURNS public.geography
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT point(lon, lat)::public.geography;
$$;

CREATE OR REPLACE FUNCTION public.vm_lat(g public.geography)
RETURNS DOUBLE PRECISION
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT (g::point)[1];
$$;

CREATE OR REPLACE FUNCTION public.vm_lon(g public.geography)
RETURNS DOUBLE PRECISION
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT (g::point)[0];
$$;

CREATE OR REPLACE FUNCTION public.vm_distance_meters(g1 public.geography, lon DOUBLE PRECISION, lat DOUBLE PRECISION)
RETURNS DOUBLE PRECISION
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT earth_distance(
        ll_to_earth((g1::point)[1], (g1::point)[0]),
        ll_to_earth(lat, lon)
    );
$$;

CREATE OR REPLACE FUNCTION public.vm_dwithin_meters(g1 public.geography, lon DOUBLE PRECISION, lat DOUBLE PRECISION, radius_m DOUBLE PRECISION)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT earth_distance(
        ll_to_earth((g1::point)[1], (g1::point)[0]),
        ll_to_earth(lat, lon)
    ) <= radius_m;
$$;

CREATE SCHEMA IF NOT EXISTS ref_mdm;
CREATE SCHEMA IF NOT EXISTS mdm_core;
CREATE SCHEMA IF NOT EXISTS dw_dim;
CREATE SCHEMA IF NOT EXISTS dw_fact;

-- =============================================================================
-- SCHEMA 1: ref_mdm (Master Reference Codes & Decoupled Text Tables)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ref_mdm.cd_domain (
    domain_cd SMALLINT PRIMARY KEY,
    domain_mnemonic VARCHAR(32) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS ref_mdm.cd_reference_value (
    ref_cd INT PRIMARY KEY,
    domain_cd SMALLINT NOT NULL REFERENCES ref_mdm.cd_domain(domain_cd),
    std_code VARCHAR(24) UNIQUE NOT NULL,
    sort_seq SMALLINT NOT NULL DEFAULT 1,
    active_ind CHAR(1) NOT NULL DEFAULT 'Y'
);

CREATE TABLE IF NOT EXISTS ref_mdm.txt_reference_label (
    txt_label_id BIGSERIAL PRIMARY KEY,
    ref_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd) ON DELETE CASCADE,
    lang_cd CHAR(2) NOT NULL DEFAULT 'EN',
    short_label_txt VARCHAR(40) NOT NULL,
    medium_label_txt VARCHAR(100) NOT NULL,
    long_desc_txt VARCHAR(500),
    UNIQUE (ref_cd, lang_cd)
);

CREATE OR REPLACE VIEW ref_mdm.txt_code_translation AS
SELECT
    txt_label_id,
    ref_cd,
    lang_cd,
    short_label_txt,
    medium_label_txt,
    long_desc_txt
FROM ref_mdm.txt_reference_label;

-- =============================================================================
-- SCHEMA 2: mdm_core (IBM MDM Golden Entities, Text Store, KV & SCD Type 4)
-- =============================================================================

CREATE TABLE IF NOT EXISTS mdm_core.mdm_party (
    party_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_type_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    party_stat_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    kyc_verif_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    pref_map_style_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    trust_score_num NUMERIC(3,2) NOT NULL DEFAULT 5.00,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mdm_core.mdm_party_credential (
    party_id UUID PRIMARY KEY REFERENCES mdm_core.mdm_party(party_id) ON DELETE CASCADE,
    email_addr VARCHAR(160) UNIQUE NOT NULL,
    phone_e164 VARCHAR(20) UNIQUE NOT NULL,
    pwd_hash_argon2 VARCHAR(255),
    upi_vpa_addr VARCHAR(100),
    version_num INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS mdm_core.mdm_party_hist_scd4 (
    hist_id BIGSERIAL PRIMARY KEY,
    party_id UUID NOT NULL,
    party_type_cd INT NOT NULL,
    kyc_verif_cd INT NOT NULL,
    phone_e164 VARCHAR(20),
    upi_vpa_addr VARCHAR(100),
    trust_score_num NUMERIC(3,2),
    eff_from_ts TIMESTAMPTZ NOT NULL,
    eff_to_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dml_action_cd CHAR(1) NOT NULL
);

-- SCD Type 4 Automated Audit Trigger Function for Party & Credential Updates/Deletes
CREATE OR REPLACE FUNCTION mdm_core.fn_trg_party_scd4_audit()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_phone VARCHAR(20);
    v_vpa VARCHAR(100);
    v_party_type INT;
    v_kyc INT;
    v_trust NUMERIC(3,2);
    v_eff_from TIMESTAMPTZ;
    v_action CHAR(1);
BEGIN
    v_action := CASE WHEN TG_OP = 'DELETE' THEN 'D' ELSE 'U' END;

    IF TG_TABLE_NAME = 'mdm_party' THEN
        SELECT phone_e164, upi_vpa_addr INTO v_phone, v_vpa
        FROM mdm_core.mdm_party_credential
        WHERE party_id = OLD.party_id;

        INSERT INTO mdm_core.mdm_party_hist_scd4 (
            party_id, party_type_cd, kyc_verif_cd, phone_e164, upi_vpa_addr,
            trust_score_num, eff_from_ts, eff_to_ts, dml_action_cd
        ) VALUES (
            OLD.party_id, OLD.party_type_cd, OLD.kyc_verif_cd, v_phone, v_vpa,
            OLD.trust_score_num, OLD.updated_ts, NOW(), v_action
        );

        IF TG_OP = 'UPDATE' THEN
            NEW.updated_ts := NOW();
            RETURN NEW;
        END IF;
        RETURN OLD;

    ELSIF TG_TABLE_NAME = 'mdm_party_credential' THEN
        SELECT party_type_cd, kyc_verif_cd, trust_score_num, updated_ts
        INTO v_party_type, v_kyc, v_trust, v_eff_from
        FROM mdm_core.mdm_party
        WHERE party_id = OLD.party_id;

        INSERT INTO mdm_core.mdm_party_hist_scd4 (
            party_id, party_type_cd, kyc_verif_cd, phone_e164, upi_vpa_addr,
            trust_score_num, eff_from_ts, eff_to_ts, dml_action_cd
        ) VALUES (
            OLD.party_id, COALESCE(v_party_type, 1001), COALESCE(v_kyc, 1021),
            OLD.phone_e164, OLD.upi_vpa_addr, COALESCE(v_trust, 5.00),
            COALESCE(v_eff_from, NOW()), NOW(), v_action
        );

        IF TG_OP = 'UPDATE' THEN
            NEW.version_num := OLD.version_num + 1;
            UPDATE mdm_core.mdm_party SET updated_ts = NOW() WHERE party_id = OLD.party_id;
            RETURN NEW;
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_party_scd4_audit ON mdm_core.mdm_party;
CREATE TRIGGER trg_party_scd4_audit
BEFORE UPDATE OR DELETE ON mdm_core.mdm_party
FOR EACH ROW EXECUTE FUNCTION mdm_core.fn_trg_party_scd4_audit();

DROP TRIGGER IF EXISTS trg_party_cred_scd4_audit ON mdm_core.mdm_party_credential;
CREATE TRIGGER trg_party_cred_scd4_audit
BEFORE UPDATE OR DELETE ON mdm_core.mdm_party_credential
FOR EACH ROW EXECUTE FUNCTION mdm_core.fn_trg_party_scd4_audit();

CREATE TABLE IF NOT EXISTS mdm_core.mdm_charging_node (
    node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_party_id UUID NOT NULL REFERENCES mdm_core.mdm_party(party_id),
    node_cat_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    discom_board_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    oper_stat_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    location_geog public.geography NOT NULL,
    pincode_num INT NOT NULL,
    rating_avg_num NUMERIC(3,2) NOT NULL DEFAULT 4.80,
    review_cnt_num INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_mdm_node_geog_gist
ON mdm_core.mdm_charging_node USING GIST (location_geog);

CREATE TABLE IF NOT EXISTS mdm_core.txt_entity_narrative (
    narrative_id BIGSERIAL PRIMARY KEY,
    entity_uuid UUID NOT NULL,
    narrative_type_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    lang_cd CHAR(2) NOT NULL DEFAULT 'EN',
    narrative_txt TEXT NOT NULL,
    UNIQUE (entity_uuid, narrative_type_cd, lang_cd)
);

CREATE INDEX IF NOT EXISTS idx_txt_entity_narrative_uuid
ON mdm_core.txt_entity_narrative(entity_uuid);

CREATE TABLE IF NOT EXISTS mdm_core.kv_entity_attribute (
    kv_id BIGSERIAL PRIMARY KEY,
    entity_uuid UUID NOT NULL,
    attr_key_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    val_code_cd INT REFERENCES ref_mdm.cd_reference_value(ref_cd),
    val_num NUMERIC(14,4),
    val_short_code VARCHAR(64),
    updated_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (entity_uuid, attr_key_cd)
);

CREATE INDEX IF NOT EXISTS idx_kv_entity_attribute_uuid
ON mdm_core.kv_entity_attribute(entity_uuid);

-- =============================================================================
-- SCHEMA 3: dw_dim (Kimball Slowly Changing Dimensions — SCD Type 2)
-- =============================================================================

CREATE TABLE IF NOT EXISTS dw_dim.dim_date (
    date_sk INT PRIMARY KEY,
    calendar_date DATE UNIQUE NOT NULL,
    day_of_week_num SMALLINT NOT NULL,
    is_weekend_ind CHAR(1) NOT NULL,
    month_num SMALLINT NOT NULL,
    year_num SMALLINT NOT NULL
);

CREATE TABLE IF NOT EXISTS dw_dim.dim_node_tariff_scd2 (
    tariff_sk BIGSERIAL PRIMARY KEY,
    node_id UUID NOT NULL REFERENCES mdm_core.mdm_charging_node(node_id) ON DELETE CASCADE,
    conn_type_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    rated_power_kw NUMERIC(6,2) NOT NULL,
    discom_board_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    energy_rate_inr NUMERIC(8,2) NOT NULL,
    parking_rate_hr_inr NUMERIC(8,2) NOT NULL,
    eff_start_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eff_end_ts TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59+00',
    curr_row_ind CHAR(1) NOT NULL DEFAULT 'Y',
    version_num INT NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dim_node_tariff_curr
ON dw_dim.dim_node_tariff_scd2(node_id, conn_type_cd)
WHERE curr_row_ind = 'Y';

CREATE TABLE IF NOT EXISTS dw_dim.dim_vehicle_scd2 (
    vehicle_sk BIGSERIAL PRIMARY KEY,
    vehicle_id UUID NOT NULL,
    owner_party_id UUID NOT NULL REFERENCES mdm_core.mdm_party(party_id) ON DELETE CASCADE,
    veh_cat_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    veh_model_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    prim_conn_type_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    battery_cap_kwh NUMERIC(6,2) NOT NULL,
    max_ac_kw NUMERIC(5,2) NOT NULL,
    is_primary_ind CHAR(1) NOT NULL DEFAULT 'N',
    eff_start_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eff_end_ts TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59+00',
    curr_row_ind CHAR(1) NOT NULL DEFAULT 'Y',
    version_num INT NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dim_vehicle_curr
ON dw_dim.dim_vehicle_scd2(vehicle_id)
WHERE curr_row_ind = 'Y';

CREATE TABLE IF NOT EXISTS dw_dim.dim_party_scd2 (
    party_sk BIGSERIAL PRIMARY KEY,
    party_id UUID NOT NULL REFERENCES mdm_core.mdm_party(party_id) ON DELETE CASCADE,
    party_type_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    kyc_verif_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    trust_score_band_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    eff_start_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eff_end_ts TIMESTAMPTZ NOT NULL DEFAULT '9999-12-31 23:59:59+00',
    curr_row_ind CHAR(1) NOT NULL DEFAULT 'Y',
    version_num INT NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dim_party_curr
ON dw_dim.dim_party_scd2(party_id)
WHERE curr_row_ind = 'Y';

-- =============================================================================
-- SCHEMA 4: dw_fact (Pure Numeric & Surrogate-Key Fact Tables)
-- =============================================================================

CREATE TABLE IF NOT EXISTS dw_fact.fact_charging_session (
    session_fact_id BIGSERIAL PRIMARY KEY,
    booking_natural_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    date_sk INT NOT NULL REFERENCES dw_dim.dim_date(date_sk),
    driver_party_sk BIGINT NOT NULL REFERENCES dw_dim.dim_party_scd2(party_sk),
    host_party_sk BIGINT NOT NULL REFERENCES dw_dim.dim_party_scd2(party_sk),
    vehicle_sk BIGINT NOT NULL REFERENCES dw_dim.dim_vehicle_scd2(vehicle_sk),
    tariff_sk BIGINT NOT NULL REFERENCES dw_dim.dim_node_tariff_scd2(tariff_sk),
    session_stat_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    gate_pass_pin_num INT NOT NULL,
    sched_start_ts TIMESTAMPTZ NOT NULL,
    sched_end_ts TIMESTAMPTZ NOT NULL,
    actual_start_ts TIMESTAMPTZ,
    actual_end_ts TIMESTAMPTZ,
    start_soc_pct NUMERIC(5,2),
    end_soc_pct NUMERIC(5,2),
    delivered_kwh NUMERIC(8,3) NOT NULL DEFAULT 0.000,
    charging_duration_sec INT NOT NULL DEFAULT 0,
    energy_cost_inr NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    parking_cost_inr NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_settled_inr NUMERIC(10,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS dw_fact.fact_wallet_ledger (
    ledger_fact_id BIGSERIAL PRIMARY KEY,
    txn_natural_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    date_sk INT NOT NULL REFERENCES dw_dim.dim_date(date_sk),
    party_sk BIGINT NOT NULL REFERENCES dw_dim.dim_party_scd2(party_sk),
    session_fact_id BIGINT REFERENCES dw_fact.fact_charging_session(session_fact_id),
    txn_type_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    dr_cr_ind CHAR(1) NOT NULL,
    txn_amt_inr NUMERIC(10,2) NOT NULL,
    running_bal_inr NUMERIC(10,2) NOT NULL,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dw_fact.fact_booking_lifecycle (
    lifecycle_fact_id BIGSERIAL PRIMARY KEY,
    session_fact_id BIGINT NOT NULL REFERENCES dw_fact.fact_charging_session(session_fact_id) ON DELETE CASCADE,
    date_sk INT NOT NULL REFERENCES dw_dim.dim_date(date_sk),
    from_stat_cd INT REFERENCES ref_mdm.cd_reference_value(ref_cd),
    to_stat_cd INT NOT NULL REFERENCES ref_mdm.cd_reference_value(ref_cd),
    transition_elapsed_sec INT NOT NULL DEFAULT 0,
    event_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dw_fact.fact_telemetry_tick (
    telemetry_tick_id BIGSERIAL PRIMARY KEY,
    session_fact_id BIGINT NOT NULL REFERENCES dw_fact.fact_charging_session(session_fact_id) ON DELETE CASCADE,
    voltage_v NUMERIC(6,2) NOT NULL,
    current_a NUMERIC(6,2) NOT NULL,
    power_kw NUMERIC(6,2) NOT NULL,
    cumulative_kwh NUMERIC(8,3) NOT NULL,
    soc_pct NUMERIC(5,2) NOT NULL,
    tick_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PART 2: ENTERPRISE RESOLUTION VIEWS FOR FASTAPI CONSUMPTION
-- =============================================================================

CREATE OR REPLACE VIEW mdm_core.vw_resolved_stations AS
SELECT
    n.node_id,
    n.host_party_id,
    t.tariff_sk,
    t.version_num AS tariff_version_num,
    n.node_cat_cd,
    rv_cat.std_code AS node_category_std_code,
    lbl_cat.short_label_txt AS node_category_label,
    t.conn_type_cd,
    rv_conn.std_code AS connector_std_code,
    lbl_conn.short_label_txt AS connector_short_label,
    lbl_conn.medium_label_txt AS connector_medium_label,
    t.rated_power_kw,
    n.discom_board_cd,
    lbl_discom.short_label_txt AS discom_short_label,
    lbl_discom.medium_label_txt AS discom_medium_label,
    n.oper_stat_cd,
    rv_stat.std_code AS oper_status_std_code,
    lbl_stat.short_label_txt AS oper_status_label,
    public.vm_lat(n.location_geog) AS latitude,
    public.vm_lon(n.location_geog) AS longitude,
    n.pincode_num,
    n.rating_avg_num,
    n.review_cnt_num,
    t.energy_rate_inr,
    t.parking_rate_hr_inr,
    nar_title.narrative_txt AS station_title,
    nar_addr.narrative_txt AS street_address,
    nar_gate.narrative_txt AS gate_instructions,
    nar_soc.narrative_txt AS society_name,
    nar_desc.narrative_txt AS station_description,
    nar_host.narrative_txt AS host_full_name,
    hp.trust_score_num AS host_trust_score,
    hc.phone_e164 AS host_phone_e164,
    kv_bay.val_short_code AS parking_bay_code,
    kv_kseb.val_short_code AS kseb_consumer_no,
    COALESCE(kv_amp.val_num, 15.0) AS max_amperage_num,
    CASE WHEN COALESCE(kv_cov.val_num, 1) = 1 THEN TRUE ELSE FALSE END AS covered_parking_bool,
    CASE WHEN COALESCE(kv_cctv.val_num, 1) = 1 THEN TRUE ELSE FALSE END AS cctv_bool,
    CASE WHEN COALESCE(kv_inst.val_num, 1) = 1 THEN TRUE ELSE FALSE END AS instant_book_bool,
    CASE WHEN COALESCE(kv_iot.val_num, 1) = 1 THEN TRUE ELSE FALSE END AS smart_iot_bool
FROM mdm_core.mdm_charging_node n
JOIN dw_dim.dim_node_tariff_scd2 t
  ON t.node_id = n.node_id AND t.curr_row_ind = 'Y'
JOIN mdm_core.mdm_party hp
  ON hp.party_id = n.host_party_id
LEFT JOIN mdm_core.mdm_party_credential hc
  ON hc.party_id = n.host_party_id
JOIN ref_mdm.cd_reference_value rv_cat ON rv_cat.ref_cd = n.node_cat_cd
JOIN ref_mdm.txt_reference_label lbl_cat ON lbl_cat.ref_cd = n.node_cat_cd AND lbl_cat.lang_cd = 'EN'
JOIN ref_mdm.cd_reference_value rv_conn ON rv_conn.ref_cd = t.conn_type_cd
JOIN ref_mdm.txt_reference_label lbl_conn ON lbl_conn.ref_cd = t.conn_type_cd AND lbl_conn.lang_cd = 'EN'
JOIN ref_mdm.txt_reference_label lbl_discom ON lbl_discom.ref_cd = n.discom_board_cd AND lbl_discom.lang_cd = 'EN'
JOIN ref_mdm.cd_reference_value rv_stat ON rv_stat.ref_cd = n.oper_stat_cd
JOIN ref_mdm.txt_reference_label lbl_stat ON lbl_stat.ref_cd = n.oper_stat_cd AND lbl_stat.lang_cd = 'EN'
LEFT JOIN mdm_core.txt_entity_narrative nar_title
  ON nar_title.entity_uuid = n.node_id AND nar_title.narrative_type_cd = 8002 AND nar_title.lang_cd = 'EN'
LEFT JOIN mdm_core.txt_entity_narrative nar_addr
  ON nar_addr.entity_uuid = n.node_id AND nar_addr.narrative_type_cd = 8003 AND nar_addr.lang_cd = 'EN'
LEFT JOIN mdm_core.txt_entity_narrative nar_gate
  ON nar_gate.entity_uuid = n.node_id AND nar_gate.narrative_type_cd = 8004 AND nar_gate.lang_cd = 'EN'
LEFT JOIN mdm_core.txt_entity_narrative nar_soc
  ON nar_soc.entity_uuid = n.node_id AND nar_soc.narrative_type_cd = 8006 AND nar_soc.lang_cd = 'EN'
LEFT JOIN mdm_core.txt_entity_narrative nar_desc
  ON nar_desc.entity_uuid = n.node_id AND nar_desc.narrative_type_cd = 8007 AND nar_desc.lang_cd = 'EN'
LEFT JOIN mdm_core.txt_entity_narrative nar_host
  ON nar_host.entity_uuid = n.host_party_id AND nar_host.narrative_type_cd = 8001 AND nar_host.lang_cd = 'EN'
LEFT JOIN mdm_core.kv_entity_attribute kv_bay
  ON kv_bay.entity_uuid = n.node_id AND kv_bay.attr_key_cd = 9003
LEFT JOIN mdm_core.kv_entity_attribute kv_kseb
  ON kv_kseb.entity_uuid = n.node_id AND kv_kseb.attr_key_cd = 9001
LEFT JOIN mdm_core.kv_entity_attribute kv_amp
  ON kv_amp.entity_uuid = n.node_id AND kv_amp.attr_key_cd = 9004
LEFT JOIN mdm_core.kv_entity_attribute kv_cov
  ON kv_cov.entity_uuid = n.node_id AND kv_cov.attr_key_cd = 9005
LEFT JOIN mdm_core.kv_entity_attribute kv_cctv
  ON kv_cctv.entity_uuid = n.node_id AND kv_cctv.attr_key_cd = 9006
LEFT JOIN mdm_core.kv_entity_attribute kv_inst
  ON kv_inst.entity_uuid = n.node_id AND kv_inst.attr_key_cd = 9007
LEFT JOIN mdm_core.kv_entity_attribute kv_iot
  ON kv_iot.entity_uuid = n.node_id AND kv_iot.attr_key_cd = 9008;

CREATE OR REPLACE VIEW dw_dim.vw_station_catalog AS
SELECT * FROM mdm_core.vw_resolved_stations;

CREATE OR REPLACE VIEW dw_fact.vw_resolved_sessions AS
SELECT
    f.session_fact_id,
    f.booking_natural_uuid,
    f.date_sk,
    d.calendar_date,
    f.driver_party_sk,
    dp.party_id AS driver_party_id,
    nar_drv.narrative_txt AS driver_full_name,
    f.host_party_sk,
    hp.party_id AS host_party_id,
    nar_hst.narrative_txt AS host_full_name,
    f.vehicle_sk,
    dv.vehicle_id,
    dv.veh_model_cd,
    lbl_veh.short_label_txt AS vehicle_model_name,
    lbl_veh.medium_label_txt AS vehicle_full_spec,
    kv_rc.val_short_code AS vehicle_rc_plate,
    f.tariff_sk,
    dt.node_id,
    nar_st.narrative_txt AS station_title,
    nar_addr.narrative_txt AS station_address,
    nar_gate.narrative_txt AS gate_instructions,
    dt.conn_type_cd,
    lbl_conn.short_label_txt AS connector_label,
    dt.rated_power_kw,
    dt.energy_rate_inr AS historical_energy_rate_inr,
    dt.parking_rate_hr_inr AS historical_parking_rate_inr,
    dt.version_num AS locked_tariff_version,
    dt.curr_row_ind AS is_current_tariff_ind,
    f.session_stat_cd,
    rv_stat.std_code AS session_status_std_code,
    lbl_stat.short_label_txt AS session_status_label,
    f.gate_pass_pin_num,
    f.sched_start_ts,
    f.sched_end_ts,
    f.actual_start_ts,
    f.actual_end_ts,
    f.start_soc_pct,
    f.end_soc_pct,
    f.delivered_kwh,
    f.charging_duration_sec,
    f.energy_cost_inr,
    f.parking_cost_inr,
    f.total_settled_inr
FROM dw_fact.fact_charging_session f
JOIN dw_dim.dim_date d ON d.date_sk = f.date_sk
JOIN dw_dim.dim_party_scd2 dp ON dp.party_sk = f.driver_party_sk
JOIN dw_dim.dim_party_scd2 hp ON hp.party_sk = f.host_party_sk
JOIN dw_dim.dim_vehicle_scd2 dv ON dv.vehicle_sk = f.vehicle_sk
JOIN dw_dim.dim_node_tariff_scd2 dt ON dt.tariff_sk = f.tariff_sk
JOIN ref_mdm.cd_reference_value rv_stat ON rv_stat.ref_cd = f.session_stat_cd
JOIN ref_mdm.txt_reference_label lbl_stat ON lbl_stat.ref_cd = f.session_stat_cd AND lbl_stat.lang_cd = 'EN'
JOIN ref_mdm.txt_reference_label lbl_veh ON lbl_veh.ref_cd = dv.veh_model_cd AND lbl_veh.lang_cd = 'EN'
JOIN ref_mdm.txt_reference_label lbl_conn ON lbl_conn.ref_cd = dt.conn_type_cd AND lbl_conn.lang_cd = 'EN'
LEFT JOIN mdm_core.txt_entity_narrative nar_drv
  ON nar_drv.entity_uuid = dp.party_id AND nar_drv.narrative_type_cd = 8001 AND nar_drv.lang_cd = 'EN'
LEFT JOIN mdm_core.txt_entity_narrative nar_hst
  ON nar_hst.entity_uuid = hp.party_id AND nar_hst.narrative_type_cd = 8001 AND nar_hst.lang_cd = 'EN'
LEFT JOIN mdm_core.txt_entity_narrative nar_st
  ON nar_st.entity_uuid = dt.node_id AND nar_st.narrative_type_cd = 8002 AND nar_st.lang_cd = 'EN'
LEFT JOIN mdm_core.txt_entity_narrative nar_addr
  ON nar_addr.entity_uuid = dt.node_id AND nar_addr.narrative_type_cd = 8003 AND nar_addr.lang_cd = 'EN'
LEFT JOIN mdm_core.txt_entity_narrative nar_gate
  ON nar_gate.entity_uuid = dt.node_id AND nar_gate.narrative_type_cd = 8004 AND nar_gate.lang_cd = 'EN'
LEFT JOIN mdm_core.kv_entity_attribute kv_rc
  ON kv_rc.entity_uuid = dv.vehicle_id AND kv_rc.attr_key_cd = 9002;

CREATE OR REPLACE VIEW dw_fact.vw_session_details AS
SELECT * FROM dw_fact.vw_resolved_sessions;

CREATE OR REPLACE VIEW dw_dim.vw_resolved_vehicles AS
SELECT
    dv.vehicle_sk,
    dv.vehicle_id,
    dv.owner_party_id,
    dv.veh_cat_cd,
    lbl_cat.short_label_txt AS vehicle_category_label,
    dv.veh_model_cd,
    lbl_mod.short_label_txt AS vehicle_model_name,
    lbl_mod.medium_label_txt AS vehicle_model_full_spec,
    dv.prim_conn_type_cd,
    lbl_conn.short_label_txt AS primary_connector_label,
    dv.battery_cap_kwh,
    dv.max_ac_kw,
    dv.is_primary_ind,
    kv_rc.val_short_code AS rc_plate_code,
    COALESCE(kv_soc.val_num, 72.0) AS current_soc_pct,
    COALESCE(kv_rng.val_num, 252.0) AS estimated_range_km,
    dv.version_num,
    dv.curr_row_ind
FROM dw_dim.dim_vehicle_scd2 dv
JOIN ref_mdm.txt_reference_label lbl_cat ON lbl_cat.ref_cd = dv.veh_cat_cd AND lbl_cat.lang_cd = 'EN'
JOIN ref_mdm.txt_reference_label lbl_mod ON lbl_mod.ref_cd = dv.veh_model_cd AND lbl_mod.lang_cd = 'EN'
JOIN ref_mdm.txt_reference_label lbl_conn ON lbl_conn.ref_cd = dv.prim_conn_type_cd AND lbl_conn.lang_cd = 'EN'
LEFT JOIN mdm_core.kv_entity_attribute kv_rc
  ON kv_rc.entity_uuid = dv.vehicle_id AND kv_rc.attr_key_cd = 9002
LEFT JOIN mdm_core.kv_entity_attribute kv_soc
  ON kv_soc.entity_uuid = dv.vehicle_id AND kv_soc.attr_key_cd = 9009
LEFT JOIN mdm_core.kv_entity_attribute kv_rng
  ON kv_rng.entity_uuid = dv.vehicle_id AND kv_rng.attr_key_cd = 9010
WHERE dv.curr_row_ind = 'Y';

