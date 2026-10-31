"""
Automated Bootstrap, DDL Executor, Master Seeder & SCD Type 2 Engine
for VoltMate Enterprise IBM MDM + Kimball Data Warehouse (PostgreSQL: voltmate_edw)
"""

import asyncio
import logging
from pathlib import Path
from datetime import datetime, date, timezone, timedelta
from decimal import Decimal
from typing import Optional
from uuid import UUID
import asyncpg
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

logger = logging.getLogger("voltmate.edw")

# Deterministic UUIDs for Golden MDM Entities so Foreign Keys & Views resolve cleanly
PARTY_DRIVER_NIDHIN = UUID("11111111-1111-4111-8111-111111111101")
PARTY_HOST_ARUN = UUID("11111111-1111-4111-8111-111111111102")
PARTY_HOST_GRID = UUID("11111111-1111-4111-8111-111111111103")
PARTY_HOST_DEEPA = UUID("11111111-1111-4111-8111-111111111104")
PARTY_HOST_MANOJ = UUID("11111111-1111-4111-8111-111111111105")
PARTY_DRV_RAHUL = UUID("11111111-1111-4111-8111-111111111106")
PARTY_DRV_SNEHA = UUID("11111111-1111-4111-8111-111111111107")

NODE_LOTUS_VILLA = UUID("00000000-0000-0000-0000-000000000001")
NODE_SPARK_HUB = UUID("00000000-0000-0000-0000-000000000002")
NODE_INFOPARK_PLAZA = UUID("00000000-0000-0000-0000-000000000003")
NODE_LULU_CORRIDOR = UUID("00000000-0000-0000-0000-000000000004")
NODE_ADIMALI_GHAT = UUID("00000000-0000-0000-0000-000000000005")
NODE_KOLLAM_BYPASS = UUID("00000000-0000-0000-0000-000000000006")

VEH_TATA_NEXON = UUID("22222222-2222-4222-8222-222222222201")
VEH_MG_WINDSOR = UUID("22222222-2222-4222-8222-222222222202")
VEH_ATHER_450X = UUID("22222222-2222-4222-8222-222222222203")

BOOKING_HIST_1 = UUID("33333333-3333-4333-8333-333333333301")
BOOKING_HIST_2 = UUID("33333333-3333-4333-8333-333333333302")
BOOKING_UPCOMING_1 = UUID("33333333-3333-4333-8333-333333333303")
BOOKING_REQ_1 = UUID("33333333-3333-4333-8333-333333333304")


async def _connect_pg_with_fallback(database: str) -> asyncpg.Connection:
    passwords = [
        settings.POSTGRES_PASSWORD,
        "Smart_Bike@04",
        "ABC 123",
        "ABC123",
    ]
    last_err = None
    for pwd in passwords:
        try:
            conn = await asyncpg.connect(
                user=settings.POSTGRES_USER,
                password=pwd,
                host=settings.POSTGRES_HOST,
                port=settings.POSTGRES_PORT,
                database=database,
            )
            return conn
        except Exception as e:
            last_err = e
    raise RuntimeError(f"Unable to connect to local PostgreSQL ({database}): {last_err}")


async def bootstrap_voltmate_edw() -> dict:
    """
    Connects to local PostgreSQL default `postgres` DB, creates `voltmate_edw` if missing,
    executes the 4-schema DDL (`edw_schema.sql`), and seeds reference codes, golden MDM
    entities, SCD2 dimensions, SCD4 audit history, and pure numeric fact tables.
    """
    # 1. Ensure `voltmate_edw` database exists
    admin_conn = await _connect_pg_with_fallback("postgres")
    try:
        db_exists = await admin_conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", settings.POSTGRES_DB
        )
        if not db_exists:
            await admin_conn.execute(f'CREATE DATABASE "{settings.POSTGRES_DB}"')
            logger.info(f"Created PostgreSQL database '{settings.POSTGRES_DB}'.")
    finally:
        await admin_conn.close()

    # 2. Connect to `voltmate_edw` and execute DDL
    conn = await _connect_pg_with_fallback(settings.POSTGRES_DB)
    try:
        ddl_path = Path(__file__).parent / "edw_schema.sql"
        ddl_sql = ddl_path.read_text(encoding="utf-8")
        await conn.execute(ddl_sql)
        logger.info("Executed 4-Schema Enterprise EDW DDL (ref_mdm, mdm_core, dw_dim, dw_fact).")

        # 3. Seed SCHEMA 1: ref_mdm (Domains, Reference Codes & Decoupled Text Translations)
        domains = [
            (10, "PARTY_ATTRIBUTES"),
            (20, "CONNECTOR_TYPE"),
            (30, "DISCOM_BOARD"),
            (40, "BOOKING_STATUS"),
            (50, "VEHICLE_MODEL"),
            (60, "LEDGER_TXN_TYPE"),
            (70, "NODE_CATEGORY_STAT"),
            (80, "TEXT_NARRATIVE_TYPE"),
            (90, "KV_ATTRIBUTE_KEY"),
        ]
        for dom_cd, mnemonic in domains:
            await conn.execute(
                """
                INSERT INTO ref_mdm.cd_domain (domain_cd, domain_mnemonic)
                VALUES ($1, $2)
                ON CONFLICT (domain_cd) DO UPDATE SET domain_mnemonic = EXCLUDED.domain_mnemonic
                """,
                dom_cd,
                mnemonic,
            )

        # (ref_cd, domain_cd, std_code, sort_seq, short_label, medium_label, long_desc)
        ref_catalog = [
            # Domain 10: Party Roles, Status, KYC, Map Style, Trust Bands
            (1001, 10, "ROLE_DRIVER", 1, "EV Driver", "Verified EV Driver Account", "Standard driver party role"),
            (1002, 10, "ROLE_HOST", 2, "P2P Host", "Verified Community Charger Host", "Residential or commercial charger host"),
            (1003, 10, "ROLE_DUAL", 3, "Driver & Host", "Dual EV Driver & P2P Host", "Full platform participant"),
            (1011, 10, "STAT_ACTIVE", 1, "Active", "Active Party Status", "Account in good standing"),
            (1012, 10, "STAT_SUSPENDED", 2, "Suspended", "Temporarily Suspended Account", "Account restricted"),
            (1021, 10, "KYC_VERIFIED", 1, "KYC Verified", "KSEB / Aadhaar / DigiLocker Verified", "Full identity verification completed"),
            (1022, 10, "KYC_PENDING", 2, "KYC Pending", "Basic OTP Verified", "Pending utility bill verification"),
            (1031, 10, "MAP_STREET", 1, "Street Map", "Standard Vector Street Map", "Default map style"),
            (1032, 10, "MAP_SAT", 2, "Satellite", "High-Res Satellite Imagery", "Satellite hybrid map style"),
            (1041, 10, "TRUST_PLATINUM", 1, "Platinum 4.8+", "Platinum Trust Band (4.80 - 5.00)", "Top tier community rating"),
            (1042, 10, "TRUST_GOLD", 2, "Gold 4.0+", "Gold Trust Band (4.00 - 4.79)", "Standard verified trust band"),
            # Domain 20: Connector Types
            (2001, 20, "CONN_15A_AC", 1, "15A 3-Pin Socket", "15A 3-Pin Domestic AC (3.3 kW)", "Indian IS-1293 15A 230V domestic EV socket"),
            (2002, 20, "CONN_TYPE2_AC", 2, "Type-2 AC", "Type-2 AC Wallbox (7.4 kW - 22 kW)", "IEC 62196 Type-2 AC connector for Indian 4W EVs"),
            (2003, 20, "CONN_CCS2_DC", 3, "CCS2 DC Fast", "CCS2 Dual-Gun DC Fast (50 kW - 60 kW)", "Combined Charging System 2 high-voltage DC fast charger"),
            # Domain 30: DISCOM Boards
            (3001, 30, "DISCOM_KSEB", 1, "KSEB", "Kerala State Electricity Board (KSEB)", "Kerala LT-Domestic & EV Tariff Board"),
            (3002, 30, "DISCOM_BESCOM", 2, "BESCOM", "Bangalore Electricity Supply Company", "Karnataka EV Tariff Board"),
            (3003, 30, "DISCOM_TANGEDCO", 3, "TANGEDCO", "Tamil Nadu Generation and Distribution Corp", "Tamil Nadu EV Tariff Board"),
            # Domain 40: Booking & Session Status
            (4001, 40, "BOOK_RESERVED", 1, "Reserved", "Confirmed Slot & Gate Pass Issued", "Slot locked with 6-digit gate pass PIN"),
            (4002, 40, "BOOK_ACTIVE", 2, "Active Charging", "Live Power Delivery in Progress", "Active telemetry session running"),
            (4003, 40, "BOOK_SETTLED", 3, "Completed & Settled", "Session Completed & GST Invoice Settled", "Financially settled session"),
            (4004, 40, "BOOK_DECLINED", 4, "Declined / Cancelled", "Booking Cancelled or Declined", "Terminated prior to power delivery"),
            (4005, 40, "BOOK_REQUESTED", 5, "Requested", "Awaiting Host Approval", "Pending 5-minute host response window"),
            # Domain 50: Vehicle Categories & Models
            (5001, 50, "VEH_TATA_NEXON", 1, "Tata Nexon EV", "Tata Nexon EV Empowered+ LR (45 kWh)", "Indian 4W SUV with CCS2 & Type-2 AC support"),
            (5002, 50, "VEH_MG_WINDSOR", 2, "MG Windsor EV", "MG Windsor EV Essence (38 kWh)", "Indian 4W CUV with CCS2 & 7.4kW Type-2 AC"),
            (5003, 50, "VEH_ATHER_450X", 3, "Ather 450X Gen 3", "Ather 450X Gen 3 Pro (3.7 kWh)", "Indian 2W Smart Scooter with 15A Portable Charger"),
            (5010, 50, "VCAT_4W", 10, "4W Passenger EV", "Four-Wheeler Electric Passenger Vehicle", "Cars and SUVs"),
            (5011, 50, "VCAT_2W", 11, "2W Electric Scooter", "Two-Wheeler Electric Scooter / Bike", "Electric two-wheelers"),
            # Domain 60: Wallet Ledger Transaction Types
            (6001, 60, "TXN_UPI_TOPUP", 1, "UPI Top-Up", "Instant UPI Wallet Credit (GPay / PhonePe)", "Driver wallet top-up via UPI intent"),
            (6002, 60, "TXN_CHARGE_DEBIT", 2, "Charging Settlement", "EV Charging Session Energy & Parking Debit", "Deduction for completed kWh session"),
            (6003, 60, "TXN_HOST_CREDIT", 3, "Host Session Payout", "P2P Host Energy Sharing Credit", "Host earnings credited from session"),
            (6004, 60, "TXN_HOST_WITHDRAW", 4, "UPI Bank Settlement", "Host Escrow Withdrawal to Linked UPI VPA", "Direct payout to host bank account"),
            # Domain 70: Node Categories & Operational Status
            (7001, 70, "NCAT_P2P_HOME", 1, "P2P Home Host", "Residential P2P Home Socket / Wallbox", "Independent house or villa charger"),
            (7002, 70, "NCAT_PUBLIC_DC", 2, "Public DC Fast", "Commercial Public High-Speed DC Plaza", "Highway or tech-park DC fast hub"),
            (7003, 70, "NCAT_P2P_RWA", 3, "P2P Apartment RWA", "Gated Society / RWA Shared EV Bay", "Apartment visitor bay with digital gate pass"),
            (7004, 70, "NCAT_DEST_CAFE", 4, "Highway Rest Hub", "Destination Restaurant / Highway Plaza", "En-route highway corridor charging stop"),
            (7101, 70, "NSTAT_AVAILABLE", 10, "Available", "Online & Ready for Instant Booking", "Charger ready"),
            (7102, 70, "NSTAT_BUSY", 11, "Busy", "Currently Charging Another EV", "Occupied slot"),
            (7103, 70, "NSTAT_OFFLINE", 12, "Paused / Offline", "Paused by Host or Under Maintenance", "Temporarily unavailable"),
            # Domain 80: Text Narrative Types
            (8001, 80, "NAR_PARTY_NAME", 1, "Party Full Name", "Registered Legal / Display Name", "Human-readable name for party"),
            (8002, 80, "NAR_STATION_TITLE", 2, "Station Title", "Charging Station Display Title", "Primary station heading"),
            (8003, 80, "NAR_STREET_ADDR", 3, "Street Address", "Full Postal & Landmark Street Address", "Physical navigation address"),
            (8004, 80, "NAR_GATE_INSTR", 4, "Gate Instructions", "Society Security & Parking Entry Instructions", "Entry notes for security guard"),
            (8005, 80, "NAR_REVIEW_TXT", 5, "Verified Review", "Driver Session Feedback Narrative", "Review text"),
            (8006, 80, "NAR_SOCIETY_NAME", 6, "Society / Hub Name", "Enclave, Tech Park or RWA Name", "Building or society name"),
            (8007, 80, "NAR_STATION_DESC", 7, "Station Description", "Hardware & Amenity Details", "Detailed station summary"),
            # Domain 90: Key-Value Attribute Keys
            (9001, 90, "KV_KSEB_CONS_NO", 1, "DISCOM Consumer No", "KSEB / Utility 13-Digit Consumer Number", "Verified electricity meter consumer ID"),
            (9002, 90, "KV_VEH_RC_PLATE", 2, "Vehicle RC Plate", "RTO Registration Number Plate", "Indian state RTO registration code"),
            (9003, 90, "KV_PARKING_BAY", 3, "Parking Bay Code", "Designated Slot / Pillar Identifier", "Physical parking bay label"),
            (9004, 90, "KV_MAX_AMPS", 4, "Max Amperage (A)", "Continuous Rated Circuit Current (Amps)", "MCB / RCD current rating"),
            (9005, 90, "KV_COVERED_PARK", 5, "Covered Parking", "Weatherproof Shaded / Basement Parking", "1 = Covered, 0 = Open"),
            (9006, 90, "KV_CCTV_SURV", 6, "24x7 CCTV", "Active CCTV Camera Coverage on Bay", "1 = Yes, 0 = No"),
            (9007, 90, "KV_INSTANT_BOOK", 7, "Instant Booking", "Auto-Approve Reservations & Gate Pass", "1 = Instant, 0 = Manual"),
            (9008, 90, "KV_SMART_IOT", 8, "Smart IoT Telemetry", "OCPP / MQTT Live Voltage & Current Meter", "1 = Smart Metered, 0 = Manual"),
            (9009, 90, "KV_VEH_SOC_PCT", 9, "Current SoC (%)", "Live Vehicle Battery State of Charge %", "Percentage 0-100"),
            (9010, 90, "KV_VEH_RANGE_KM", 10, "Est. Range (km)", "Projected Driving Range in Kilometers", "Remaining range in km"),
        ]

        for ref_cd, dom_cd, std_code, seq, short_lbl, med_lbl, long_desc in ref_catalog:
            await conn.execute(
                """
                INSERT INTO ref_mdm.cd_reference_value (ref_cd, domain_cd, std_code, sort_seq, active_ind)
                VALUES ($1, $2, $3, $4, 'Y')
                ON CONFLICT (ref_cd) DO UPDATE
                SET domain_cd = EXCLUDED.domain_cd, std_code = EXCLUDED.std_code, sort_seq = EXCLUDED.sort_seq
                """,
                ref_cd,
                dom_cd,
                std_code,
                seq,
            )
            await conn.execute(
                """
                INSERT INTO ref_mdm.txt_reference_label (ref_cd, lang_cd, short_label_txt, medium_label_txt, long_desc_txt)
                VALUES ($1, 'EN', $2, $3, $4)
                ON CONFLICT (ref_cd, lang_cd) DO UPDATE
                SET short_label_txt = EXCLUDED.short_label_txt,
                    medium_label_txt = EXCLUDED.medium_label_txt,
                    long_desc_txt = EXCLUDED.long_desc_txt
                """,
                ref_cd,
                short_lbl,
                med_lbl,
                long_desc,
            )

        # 4. Seed SCHEMA 3: dw_dim.dim_date (Last 30 days + Next 30 days)
        today = datetime.now(timezone.utc).date()
        for offset in range(-30, 31):
            d = today + timedelta(days=offset)
            date_sk = int(d.strftime("%Y%m%d"))
            dow = d.isoweekday()
            is_wknd = "Y" if dow in (6, 7) else "N"
            await conn.execute(
                """
                INSERT INTO dw_dim.dim_date (date_sk, calendar_date, day_of_week_num, is_weekend_ind, month_num, year_num)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (date_sk) DO NOTHING
                """,
                date_sk,
                d,
                dow,
                is_wknd,
                d.month,
                d.year,
            )

        # 5. Seed SCHEMA 2 & 3: mdm_core.mdm_party, mdm_party_credential, txt_entity_narrative & dw_dim.dim_party_scd2
        parties = [
            (PARTY_DRIVER_NIDHIN, 1003, 1011, 1021, 1031, Decimal("4.95"), "nidhinrajesh1998@gmail.com", "+919847099881", "nidhin.voltmate@okicici", "Nidhin R"),
            (PARTY_HOST_ARUN, 1002, 1011, 1021, 1031, Decimal("4.92"), "arun.k@lotusgreens.in", "+919847011223", "arun.host@okaxis", "Arun Kumar"),
            (PARTY_HOST_GRID, 1002, 1011, 1021, 1031, Decimal("4.88"), "grid.ops@voltmate.in", "+919847022334", "voltmate.grid@okhdfcbank", "VoltMate Public Grid"),
            (PARTY_HOST_DEEPA, 1002, 1011, 1021, 1031, Decimal("4.98"), "deepa.nair@skyline.in", "+919847033445", "deepa.rwa@oksbi", "Deepa Nair"),
            (PARTY_HOST_MANOJ, 1002, 1011, 1021, 1031, Decimal("4.85"), "manoj.v@highways.in", "+919847055667", "manoj.plaza@okicici", "Manoj Varghese"),
            (PARTY_DRV_RAHUL, 1001, 1011, 1021, 1031, Decimal("4.90"), "rahul.menon@kochi.in", "+919847100201", "rahul.m@okaxis", "Rahul Menon"),
            (PARTY_DRV_SNEHA, 1001, 1011, 1021, 1031, Decimal("4.86"), "sneha.varghese@kochi.in", "+919847100202", "sneha.v@okhdfcbank", "Sneha Varghese"),
        ]

        for pid, ptype, pstat, kyc, map_cd, trust, email, phone, vpa, full_name in parties:
            await conn.execute(
                """
                INSERT INTO mdm_core.mdm_party (party_id, party_type_cd, party_stat_cd, kyc_verif_cd, pref_map_style_cd, trust_score_num)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (party_id) DO NOTHING
                """,
                pid, ptype, pstat, kyc, map_cd, trust,
            )
            await conn.execute(
                """
                INSERT INTO mdm_core.mdm_party_credential (party_id, email_addr, phone_e164, pwd_hash_argon2, upi_vpa_addr, version_num)
                VALUES ($1, $2, $3, '$argon2id$v=19$m=65536,t=3,p=4$voltmate_edw_hash', $4, 1)
                ON CONFLICT (party_id) DO NOTHING
                """,
                pid, email, phone, vpa,
            )
            await conn.execute(
                """
                INSERT INTO mdm_core.txt_entity_narrative (entity_uuid, narrative_type_cd, lang_cd, narrative_txt)
                VALUES ($1, 8001, 'EN', $2)
                ON CONFLICT (entity_uuid, narrative_type_cd, lang_cd) DO UPDATE
                SET narrative_txt = EXCLUDED.narrative_txt
                """,
                pid, full_name,
            )
            trust_band = 1041 if trust >= Decimal("4.80") else 1042
            await conn.execute(
                """
                INSERT INTO dw_dim.dim_party_scd2 (party_id, party_type_cd, kyc_verif_cd, trust_score_band_cd, eff_start_ts, eff_end_ts, curr_row_ind, version_num)
                VALUES ($1, $2, $3, $4, NOW() - INTERVAL '30 days', '9999-12-31 23:59:59+00', 'Y', 1)
                ON CONFLICT (party_id) WHERE curr_row_ind = 'Y' DO NOTHING
                """,
                pid, ptype, kyc, trust_band,
            )

        # Ensure SCD Type 4 Audit Table (`mdm_core.mdm_party_hist_scd4`) has live audit snapshots via trigger
        scd4_cnt = await conn.fetchval("SELECT COUNT(*) FROM mdm_core.mdm_party_hist_scd4")
        if scd4_cnt == 0:
            await conn.execute(
                "UPDATE mdm_core.mdm_party SET trust_score_num = 4.96 WHERE party_id = $1",
                PARTY_DRIVER_NIDHIN,
            )
            await conn.execute(
                "UPDATE mdm_core.mdm_party_credential SET upi_vpa_addr = 'nidhin.voltmate@okicici' WHERE party_id = $1",
                PARTY_DRIVER_NIDHIN,
            )

        # 6. Seed Golden Charging Nodes (`mdm_core.mdm_charging_node`), Narratives, KV Attributes & `dw_dim.dim_node_tariff_scd2`
        stations = [
            (
                NODE_LOTUS_VILLA, PARTY_HOST_ARUN, 7001, 3001, 7101,
                9.9985, 76.3580, 682030, Decimal("4.92"), 64,
                2001, Decimal("3.30"), Decimal("8.50"), Decimal("10.00"),
                "Lotus Greens Villa P2P Socket",
                "Villa 14, Lotus Greens Enclave, Kakkanad, Kochi",
                "Mention VoltMate Host Flat 14 at Main Gate security.",
                "Lotus Greens Enclave",
                "Dedicated 15A 3-Pin Legrand industrial EV socket beside covered porch.",
                "BAY-V14", "1156402008911", Decimal("15.0"),
            ),
            (
                NODE_SPARK_HUB, PARTY_HOST_GRID, 7002, 3001, 7101,
                10.0112, 76.3621, 682042, Decimal("4.85"), 128,
                2003, Decimal("60.00"), Decimal("16.50"), Decimal("20.00"),
                "Spark EV Fast Hub — Infopark Phase 1",
                "South Gate Plaza, Infopark Road, Kakkanad, Kochi",
                "Open 24x7 commercial EV charging bay beside Food Court.",
                "Infopark IT Campus",
                "Dual-gun 60kW CCS2 DC fast charger with shaded waiting lounge.",
                "BAY-DC01", "1156409981002", Decimal("150.0"),
            ),
            (
                NODE_INFOPARK_PLAZA, PARTY_HOST_DEEPA, 7003, 3001, 7101,
                9.9840, 76.3410, 682028, Decimal("4.96"), 89,
                2002, Decimal("7.40"), Decimal("10.50"), Decimal("15.00"),
                "Infopark Green Plaza RWA Type-2 Hub",
                "Basement Pillar B-12, Skyline Imperial, Kakkanad, Kochi",
                "Show 6-digit VoltMate Digital Gate Pass at Gate 2 RWA Boom Barrier.",
                "Skyline Imperial RWA",
                "7.4kW Type-2 AC Wallbox ideal for Tata Nexon EV & MG Windsor EV.",
                "BAY-B12", "1156407741230", Decimal("32.0"),
            ),
            (
                NODE_LULU_CORRIDOR, PARTY_HOST_GRID, 7002, 3001, 7101,
                10.0271, 76.3082, 682024, Decimal("4.78"), 215,
                2003, Decimal("50.00"), Decimal("15.50"), Decimal("20.00"),
                "Edappally Lulu Corridor DC Fast Hub",
                "Level G1 East Zone, NH-66 Edappally Junction, Kochi",
                "Enter via EV Priority Lane 3 at East Multilevel Parking.",
                "Edappally NH-66 Hub",
                "50kW CCS2 DC Fast Charger + Type-2 AC backup bay.",
                "BAY-G1E", "1156403319087", Decimal("125.0"),
            ),
            (
                NODE_ADIMALI_GHAT, PARTY_HOST_MANOJ, 7004, 3001, 7101,
                10.0110, 76.9528, 685561, Decimal("4.90"), 94,
                2003, Decimal("50.00"), Decimal("16.00"), Decimal("0.00"),
                "Adimali Eastern Ghat Fast Plaza",
                "NH-85 Kochi-Munnar Highway, Adimali Foothills, Idukki",
                "Direct highway pull-in beside Hillview Spice Restaurant.",
                "Eastern Ghat Highway Corridor",
                "Critical 50kW CCS2 DC + 7.4kW Type-2 mountain climb boost station.",
                "BAY-NH85", "1156881029304", Decimal("125.0"),
            ),
            (
                NODE_KOLLAM_BYPASS, PARTY_HOST_MANOJ, 7004, 3001, 7101,
                8.8932, 76.6141, 691012, Decimal("4.82"), 77,
                2003, Decimal("60.00"), Decimal("17.00"), Decimal("10.00"),
                "Kollam Bypass NH-66 Highway Plaza",
                "Mevaram Junction, NH-66 Bypass, Kollam, Kerala",
                "24x7 Highway EV Lounge Entry — Automated ANPR Gate.",
                "NH-66 Coastal Corridor",
                "60kW Dual CCS2 DC Fast Charger for Kochi-Trivandrum intercity trips.",
                "BAY-KL02", "1156991004412", Decimal("150.0"),
            ),
        ]

        for (
            nid, host_pid, ncat_cd, discom_cd, stat_cd,
            lat, lon, pincode, rating, rev_cnt,
            conn_cd, power_kw, energy_inr, park_inr,
            title, addr, gate_instr, soc_name, desc_txt,
            bay_code, kseb_no, max_amps
        ) in stations:
            await conn.execute(
                """
                INSERT INTO mdm_core.mdm_charging_node (
                    node_id, host_party_id, node_cat_cd, discom_board_cd, oper_stat_cd,
                    location_geog, pincode_num, rating_avg_num, review_cnt_num
                )
                VALUES ($1, $2, $3, $4, $5, public.vm_geog_from_lonlat($6, $7), $8, $9, $10)
                ON CONFLICT (node_id) DO UPDATE
                SET location_geog = EXCLUDED.location_geog,
                    rating_avg_num = EXCLUDED.rating_avg_num,
                    review_cnt_num = EXCLUDED.review_cnt_num
                """,
                nid, host_pid, ncat_cd, discom_cd, stat_cd,
                float(lon), float(lat), pincode, rating, rev_cnt,
            )

            # Narratives (8002=Title, 8003=Address, 8004=Gate Instructions, 8006=Society, 8007=Description)
            for ntype_cd, ntxt in [
                (8002, title),
                (8003, addr),
                (8004, gate_instr),
                (8006, soc_name),
                (8007, desc_txt),
            ]:
                await conn.execute(
                    """
                    INSERT INTO mdm_core.txt_entity_narrative (entity_uuid, narrative_type_cd, lang_cd, narrative_txt)
                    VALUES ($1, $2, 'EN', $3)
                    ON CONFLICT (entity_uuid, narrative_type_cd, lang_cd) DO UPDATE
                    SET narrative_txt = EXCLUDED.narrative_txt
                    """,
                    nid, ntype_cd, ntxt,
                )

            # Key-Value Attributes (9001=KSEB No, 9003=Bay Code, 9004=Max Amps, 9005=Covered, 9006=CCTV, 9007=InstantBook, 9008=SmartIoT)
            kv_rows = [
                (9001, None, None, kseb_no),
                (9003, None, None, bay_code),
                (9004, None, max_amps, None),
                (9005, None, Decimal("1"), "TRUE"),
                (9006, None, Decimal("1"), "TRUE"),
                (9007, None, Decimal("1"), "TRUE"),
                (9008, None, Decimal("1"), "TRUE"),
            ]
            for attr_cd, v_cd, v_num, v_str in kv_rows:
                await conn.execute(
                    """
                    INSERT INTO mdm_core.kv_entity_attribute (entity_uuid, attr_key_cd, val_code_cd, val_num, val_short_code)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (entity_uuid, attr_key_cd) DO UPDATE
                    SET val_num = EXCLUDED.val_num, val_short_code = EXCLUDED.val_short_code
                    """,
                    nid, attr_cd, v_cd, v_num, v_str,
                )

            # SCD Type 2 Tariff Dimension
            await conn.execute(
                """
                INSERT INTO dw_dim.dim_node_tariff_scd2 (
                    node_id, conn_type_cd, rated_power_kw, discom_board_cd,
                    energy_rate_inr, parking_rate_hr_inr, eff_start_ts, eff_end_ts, curr_row_ind, version_num
                )
                VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '30 days', '9999-12-31 23:59:59+00', 'Y', 1)
                ON CONFLICT (node_id, conn_type_cd) WHERE curr_row_ind = 'Y' DO NOTHING
                """,
                nid, conn_cd, power_kw, discom_cd, energy_inr, park_inr,
            )

        # 7. Seed SCHEMA 3: dw_dim.dim_vehicle_scd2 & Vehicle KV Attributes
        vehicles = [
            (VEH_TATA_NEXON, PARTY_DRIVER_NIDHIN, 5010, 5001, 2003, Decimal("45.00"), Decimal("7.20"), "Y", "KL-07-CS-4921", Decimal("72.0"), Decimal("252.0")),
            (VEH_MG_WINDSOR, PARTY_DRIVER_NIDHIN, 5010, 5002, 2002, Decimal("38.00"), Decimal("7.40"), "N", "KL-07-DF-1092", Decimal("84.0"), Decimal("260.0")),
            (VEH_ATHER_450X, PARTY_DRIVER_NIDHIN, 5011, 5003, 2001, Decimal("3.70"), Decimal("1.50"), "N", "KL-07-BX-8821", Decimal("90.0"), Decimal("98.0")),
        ]
        for vid, owner_pid, vcat_cd, vmod_cd, pconn_cd, cap_kwh, max_ac, is_prim, rc_plate, soc_pct, rng_km in vehicles:
            await conn.execute(
                """
                INSERT INTO dw_dim.dim_vehicle_scd2 (
                    vehicle_id, owner_party_id, veh_cat_cd, veh_model_cd, prim_conn_type_cd,
                    battery_cap_kwh, max_ac_kw, is_primary_ind, eff_start_ts, eff_end_ts, curr_row_ind, version_num
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL '30 days', '9999-12-31 23:59:59+00', 'Y', 1)
                ON CONFLICT (vehicle_id) WHERE curr_row_ind = 'Y' DO NOTHING
                """,
                vid, owner_pid, vcat_cd, vmod_cd, pconn_cd, cap_kwh, max_ac, is_prim,
            )
            for attr_cd, v_num, v_str in [
                (9002, None, rc_plate),
                (9009, soc_pct, None),
                (9010, rng_km, None),
            ]:
                await conn.execute(
                    """
                    INSERT INTO mdm_core.kv_entity_attribute (entity_uuid, attr_key_cd, val_num, val_short_code)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (entity_uuid, attr_key_cd) DO UPDATE
                    SET val_num = EXCLUDED.val_num, val_short_code = EXCLUDED.val_short_code
                    """,
                    vid, attr_cd, v_num, v_str,
                )

        # 8. Seed SCHEMA 4: Pure Numeric Fact Tables (`dw_fact.fact_charging_session` & `dw_fact.fact_wallet_ledger`)
        today_sk = int(today.strftime("%Y%m%d"))
        yesterday_sk = int((today - timedelta(days=1)).strftime("%Y%m%d"))

        drv_nidhin_sk = await conn.fetchval(
            "SELECT party_sk FROM dw_dim.dim_party_scd2 WHERE party_id = $1 AND curr_row_ind = 'Y'",
            PARTY_DRIVER_NIDHIN,
        )
        drv_rahul_sk = await conn.fetchval(
            "SELECT party_sk FROM dw_dim.dim_party_scd2 WHERE party_id = $1 AND curr_row_ind = 'Y'",
            PARTY_DRV_RAHUL,
        )
        host_arun_sk = await conn.fetchval(
            "SELECT party_sk FROM dw_dim.dim_party_scd2 WHERE party_id = $1 AND curr_row_ind = 'Y'",
            PARTY_HOST_ARUN,
        )
        host_grid_sk = await conn.fetchval(
            "SELECT party_sk FROM dw_dim.dim_party_scd2 WHERE party_id = $1 AND curr_row_ind = 'Y'",
            PARTY_HOST_GRID,
        )
        veh_nexon_sk = await conn.fetchval(
            "SELECT vehicle_sk FROM dw_dim.dim_vehicle_scd2 WHERE vehicle_id = $1 AND curr_row_ind = 'Y'",
            VEH_TATA_NEXON,
        )
        veh_windsor_sk = await conn.fetchval(
            "SELECT vehicle_sk FROM dw_dim.dim_vehicle_scd2 WHERE vehicle_id = $1 AND curr_row_ind = 'Y'",
            VEH_MG_WINDSOR,
        )
        tariff_lotus_sk = await conn.fetchval(
            "SELECT tariff_sk FROM dw_dim.dim_node_tariff_scd2 WHERE node_id = $1 AND curr_row_ind = 'Y'",
            NODE_LOTUS_VILLA,
        )
        tariff_spark_sk = await conn.fetchval(
            "SELECT tariff_sk FROM dw_dim.dim_node_tariff_scd2 WHERE node_id = $1 AND curr_row_ind = 'Y'",
            NODE_SPARK_HUB,
        )

        now_ts = datetime.now(timezone.utc)
        sessions_seed = [
            # Completed Session 1: Spark EV Fast Hub (18.400 kWh @ ₹16.50/kWh + ₹20 parking = ₹323.60)
            (
                BOOKING_HIST_1, yesterday_sk, drv_nidhin_sk, host_grid_sk, veh_nexon_sk, tariff_spark_sk,
                4003, 544555,
                now_ts - timedelta(days=1, hours=3), now_ts - timedelta(days=1, hours=2),
                now_ts - timedelta(days=1, hours=3), now_ts - timedelta(days=1, hours=2, minutes=28),
                Decimal("34.00"), Decimal("75.00"), Decimal("18.400"), 1920,
                Decimal("303.60"), Decimal("20.00"), Decimal("323.60"),
            ),
            # Completed Session 2: Lotus Greens Villa P2P Socket (11.200 kWh @ ₹8.50/kWh + ₹10 parking = ₹105.20)
            (
                BOOKING_HIST_2, yesterday_sk, drv_nidhin_sk, host_arun_sk, veh_windsor_sk, tariff_lotus_sk,
                4003, 618204,
                now_ts - timedelta(days=1, hours=8), now_ts - timedelta(days=1, hours=5),
                now_ts - timedelta(days=1, hours=8), now_ts - timedelta(days=1, hours=5, minutes=10),
                Decimal("48.00"), Decimal("78.00"), Decimal("11.200"), 10200,
                Decimal("95.20"), Decimal("10.00"), Decimal("105.20"),
            ),
            # Upcoming Reserved Session 3: Lotus Greens Villa P2P Socket (Status 4001 = Reserved)
            (
                BOOKING_UPCOMING_1, today_sk, drv_nidhin_sk, host_arun_sk, veh_nexon_sk, tariff_lotus_sk,
                4001, 544555,
                now_ts + timedelta(hours=1), now_ts + timedelta(hours=2),
                None, None,
                Decimal("72.00"), None, Decimal("0.000"), 0,
                Decimal("0.00"), Decimal("0.00"), Decimal("0.00"),
            ),
            # Incoming Host Request 4: Rahul Menon requesting Arun's Lotus Greens Villa (Status 4005 = Requested)
            (
                BOOKING_REQ_1, today_sk, drv_rahul_sk, host_arun_sk, veh_nexon_sk, tariff_lotus_sk,
                4005, 792311,
                now_ts + timedelta(hours=3), now_ts + timedelta(hours=5),
                None, None,
                Decimal("28.00"), None, Decimal("0.000"), 0,
                Decimal("0.00"), Decimal("0.00"), Decimal("0.00"),
            ),
        ]

        for (
            b_uuid, d_sk, d_psk, h_psk, v_sk, t_sk,
            stat_cd, pin_num, s_start, s_end, a_start, a_end,
            s_soc, e_soc, kwh, dur_sec, e_cost, p_cost, tot_inr
        ) in sessions_seed:
            await conn.execute(
                """
                INSERT INTO dw_fact.fact_charging_session (
                    booking_natural_uuid, date_sk, driver_party_sk, host_party_sk,
                    vehicle_sk, tariff_sk, session_stat_cd, gate_pass_pin_num,
                    sched_start_ts, sched_end_ts, actual_start_ts, actual_end_ts,
                    start_soc_pct, end_soc_pct, delivered_kwh, charging_duration_sec,
                    energy_cost_inr, parking_cost_inr, total_settled_inr
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                ON CONFLICT (booking_natural_uuid) DO NOTHING
                """,
                b_uuid, d_sk, d_psk, h_psk, v_sk, t_sk,
                stat_cd, pin_num, s_start, s_end, a_start, a_end,
                s_soc, e_soc, kwh, dur_sec, e_cost, p_cost, tot_inr,
            )

        # Seed Wallet Ledger Facts if empty
        ledger_cnt = await conn.fetchval("SELECT COUNT(*) FROM dw_fact.fact_wallet_ledger")
        if ledger_cnt == 0:
            sess_1_id = await conn.fetchval(
                "SELECT session_fact_id FROM dw_fact.fact_charging_session WHERE booking_natural_uuid = $1",
                BOOKING_HIST_1,
            )
            sess_2_id = await conn.fetchval(
                "SELECT session_fact_id FROM dw_fact.fact_charging_session WHERE booking_natural_uuid = $1",
                BOOKING_HIST_2,
            )
            ledger_rows = [
                (yesterday_sk, drv_nidhin_sk, None, 6001, "C", Decimal("2000.00"), Decimal("2000.00")),
                (yesterday_sk, drv_nidhin_sk, sess_1_id, 6002, "D", Decimal("323.60"), Decimal("1676.40")),
                (yesterday_sk, drv_nidhin_sk, sess_2_id, 6002, "D", Decimal("105.20"), Decimal("1571.20")),
                (yesterday_sk, host_arun_sk, sess_2_id, 6003, "C", Decimal("105.20"), Decimal("4820.00")),
            ]
            for d_sk, p_sk, sf_id, txn_cd, drcr, amt, run_bal in ledger_rows:
                await conn.execute(
                    """
                    INSERT INTO dw_fact.fact_wallet_ledger (
                        date_sk, party_sk, session_fact_id, txn_type_cd, dr_cr_ind, txn_amt_inr, running_bal_inr
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    d_sk, p_sk, sf_id, txn_cd, drcr, amt, run_bal,
                )

            # Also seed lifecycle & telemetry ticks for session 1
            if sess_1_id:
                await conn.execute(
                    """
                    INSERT INTO dw_fact.fact_booking_lifecycle (session_fact_id, date_sk, from_stat_cd, to_stat_cd, transition_elapsed_sec)
                    VALUES
                        ($1, $2, NULL, 4001, 0),
                        ($1, $2, 4001, 4002, 180),
                        ($1, $2, 4002, 4003, 1920)
                    """,
                    sess_1_id, yesterday_sk,
                )
                await conn.execute(
                    """
                    INSERT INTO dw_fact.fact_telemetry_tick (session_fact_id, voltage_v, current_a, power_kw, cumulative_kwh, soc_pct)
                    VALUES
                        ($1, 398.40, 142.50, 56.77, 6.200, 48.00),
                        ($1, 401.10, 145.20, 58.24, 12.800, 62.00),
                        ($1, 402.00, 138.00, 55.48, 18.400, 75.00)
                    """,
                    sess_1_id,
                )

        # Gather verification counts
        summary = {
            "ref_mdm.cd_domain": await conn.fetchval("SELECT COUNT(*) FROM ref_mdm.cd_domain"),
            "ref_mdm.cd_reference_value": await conn.fetchval("SELECT COUNT(*) FROM ref_mdm.cd_reference_value"),
            "ref_mdm.txt_reference_label": await conn.fetchval("SELECT COUNT(*) FROM ref_mdm.txt_reference_label"),
            "mdm_core.mdm_party": await conn.fetchval("SELECT COUNT(*) FROM mdm_core.mdm_party"),
            "mdm_core.mdm_party_hist_scd4": await conn.fetchval("SELECT COUNT(*) FROM mdm_core.mdm_party_hist_scd4"),
            "mdm_core.mdm_charging_node": await conn.fetchval("SELECT COUNT(*) FROM mdm_core.mdm_charging_node"),
            "mdm_core.txt_entity_narrative": await conn.fetchval("SELECT COUNT(*) FROM mdm_core.txt_entity_narrative"),
            "mdm_core.kv_entity_attribute": await conn.fetchval("SELECT COUNT(*) FROM mdm_core.kv_entity_attribute"),
            "dw_dim.dim_date": await conn.fetchval("SELECT COUNT(*) FROM dw_dim.dim_date"),
            "dw_dim.dim_node_tariff_scd2": await conn.fetchval("SELECT COUNT(*) FROM dw_dim.dim_node_tariff_scd2"),
            "dw_dim.dim_vehicle_scd2": await conn.fetchval("SELECT COUNT(*) FROM dw_dim.dim_vehicle_scd2"),
            "dw_dim.dim_party_scd2": await conn.fetchval("SELECT COUNT(*) FROM dw_dim.dim_party_scd2"),
            "dw_fact.fact_charging_session": await conn.fetchval("SELECT COUNT(*) FROM dw_fact.fact_charging_session"),
            "dw_fact.fact_wallet_ledger": await conn.fetchval("SELECT COUNT(*) FROM dw_fact.fact_wallet_ledger"),
            "dw_fact.fact_booking_lifecycle": await conn.fetchval("SELECT COUNT(*) FROM dw_fact.fact_booking_lifecycle"),
            "dw_fact.fact_telemetry_tick": await conn.fetchval("SELECT COUNT(*) FROM dw_fact.fact_telemetry_tick"),
        }
        logger.info(f"VoltMate EDW Bootstrap Verified: {summary}")
        return summary
    finally:
        await conn.close()


async def update_node_tariff_scd2(
    db: AsyncSession,
    node_id: UUID,
    conn_type_cd: int,
    new_rate_inr: Decimal,
    new_parking_rate_inr: Optional[Decimal] = None,
) -> dict:
    """
    Kimball SCD Type 2 Procedure for Charger Connector Tariff Evolution:
    1. Locates the active row (`curr_row_ind = 'Y'`) for `(node_id, conn_type_cd)`.
    2. Expires it (`curr_row_ind = 'N'`, `eff_end_ts = NOW()`) so historical sessions
       in `dw_fact.fact_charging_session` remain locked to the old `tariff_sk`.
    3. Inserts the new active version (`curr_row_ind = 'Y'`, `version_num = old_version + 1`).
    """
    curr_q = await db.execute(
        text(
            """
            SELECT tariff_sk, rated_power_kw, discom_board_cd, energy_rate_inr, parking_rate_hr_inr, version_num
            FROM dw_dim.dim_node_tariff_scd2
            WHERE node_id = :node_id AND conn_type_cd = :conn_cd AND curr_row_ind = 'Y'
            FOR UPDATE
            """
        ),
        {"node_id": str(node_id), "conn_cd": conn_type_cd},
    )
    old_row = curr_q.mappings().first()
    if not old_row:
        raise ValueError(f"No active tariff row found for node_id={node_id}, conn_type_cd={conn_type_cd}")

    parking_inr = new_parking_rate_inr if new_parking_rate_inr is not None else old_row["parking_rate_hr_inr"]
    next_version = int(old_row["version_num"]) + 1

    # 1. Expire old SCD2 row
    await db.execute(
        text(
            """
            UPDATE dw_dim.dim_node_tariff_scd2
            SET curr_row_ind = 'N', eff_end_ts = NOW()
            WHERE tariff_sk = :old_sk
            """
        ),
        {"old_sk": old_row["tariff_sk"]},
    )

    # 2. Insert new current SCD2 row
    ins_q = await db.execute(
        text(
            """
            INSERT INTO dw_dim.dim_node_tariff_scd2 (
                node_id, conn_type_cd, rated_power_kw, discom_board_cd,
                energy_rate_inr, parking_rate_hr_inr, eff_start_ts, eff_end_ts,
                curr_row_ind, version_num
            )
            VALUES (
                :node_id, :conn_cd, :power_kw, :discom_cd,
                :energy_inr, :parking_inr, NOW(), '9999-12-31 23:59:59+00',
                'Y', :ver_num
            )
            RETURNING tariff_sk, version_num, energy_rate_inr, parking_rate_hr_inr, eff_start_ts
            """
        ),
        {
            "node_id": str(node_id),
            "conn_cd": conn_type_cd,
            "power_kw": old_row["rated_power_kw"],
            "discom_cd": old_row["discom_board_cd"],
            "energy_inr": new_rate_inr,
            "parking_inr": parking_inr,
            "ver_num": next_version,
        },
    )
    new_row = ins_q.mappings().first()
    await db.commit()
    return {
        "expired_tariff_sk": old_row["tariff_sk"],
        "new_tariff_sk": new_row["tariff_sk"],
        "node_id": str(node_id),
        "conn_type_cd": conn_type_cd,
        "previous_rate_inr": float(old_row["energy_rate_inr"]),
        "new_rate_inr": float(new_row["energy_rate_inr"]),
        "version_num": new_row["version_num"],
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = asyncio.run(bootstrap_voltmate_edw())
    for k, v in res.items():
        print(f"  [EDW] {k:<35} -> {v} rows")
