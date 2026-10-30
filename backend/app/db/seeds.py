import asyncio
import logging
from decimal import Decimal
from sqlalchemy import text
from app.db.session import async_session_maker, engine
from app.models.node import ChargingNode, NodeType, NodeStatus
from app.models.vehicle import ConnectorType
from app.models.user import User, UserRole

logger = logging.getLogger("voltmate.seeds")

SEED_NODES = [
    # Kochi - Munnar Ghat Corridor (NH 85)
    {
        "title": "Kakkanad Green Villa 15A Socket",
        "description": "Porch socket with 5m heavy duty extension cord. 15A continuous rating with MCB.",
        "latitude": 9.9926,
        "longitude": 76.3544,
        "address_line": "Villa 14, Lotus Greens Enclave, Kakkanad",
        "society_name": "Lotus Greens Enclave",
        "gate_instructions": "Tell security gate visiting Flat 14. Access granted via VoltMate Gate Pass.",
        "node_type": NodeType.P2P_HOME,
        "connector_type": ConnectorType.SOCKET_15A,
        "power_output_kw": 3.3,
        "is_smart_iot": True,
        "iot_device_id": "tasmota_kseb_14",
        "price_per_kwh": Decimal("8.50"),
        "parking_fee_per_hr": Decimal("10.00"),
        "instant_book_enabled": True,
        "min_driver_rating": 4.0,
        "status": NodeStatus.AVAILABLE,
        "amenities": ["CCTV", "WASHROOM", "COVERED_PARKING"],
        "photos": ["https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600"],
    },
    {
        "title": "Kothamangalam Ghat Entry Saravana Bhavan",
        "description": "Highway restaurant rest stop before the steep Munnar Ghat incline. 2 dedicated 15A sockets.",
        "latitude": 10.0614,
        "longitude": 76.6267,
        "address_line": "NH 85, Near Checkpost, Kothamangalam",
        "society_name": "Highway Commercial Plaza",
        "gate_instructions": "Park in designated EV slot beside main entrance.",
        "node_type": NodeType.DESTINATION_CAFE,
        "connector_type": ConnectorType.SOCKET_15A,
        "power_output_kw": 3.3,
        "is_smart_iot": False,
        "price_per_kwh": Decimal("9.00"),
        "parking_fee_per_hr": Decimal("0.00"),
        "instant_book_enabled": True,
        "min_driver_rating": 3.5,
        "status": NodeStatus.AVAILABLE,
        "amenities": ["RESTAURANT", "WASHROOM", "TEA_STALL", "WIFI"],
        "photos": ["https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?w=600"],
    },
    {
        "title": "Adimali Valley Homestay Type-2 Wallbox",
        "description": "Mid-ghat recharge point. 7.4kW Type-2 AC Wallbox. Great for Tata Nexon, MG ZS.",
        "latitude": 10.0381,
        "longitude": 76.9534,
        "address_line": "Valley View Estate, Adimali Bypass",
        "society_name": "Valley View Estate",
        "gate_instructions": "Ring bell at front porch or show VoltMate pass.",
        "node_type": NodeType.P2P_HOME,
        "connector_type": ConnectorType.TYPE_2,
        "power_output_kw": 7.4,
        "is_smart_iot": True,
        "iot_device_id": "wallbox_adimali_01",
        "price_per_kwh": Decimal("10.00"),
        "parking_fee_per_hr": Decimal("20.00"),
        "instant_book_enabled": True,
        "min_driver_rating": 4.5,
        "status": NodeStatus.AVAILABLE,
        "amenities": ["CCTV", "MOUNTAIN_VIEW", "WASHROOM"],
        "photos": ["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600"],
    },
    # Bangalore - Mysore Expressway Corridor
    {
        "title": "Bidadi RWA Tech Park 15A Socket",
        "description": "Apartment podium parking with high quality 15A industrial socket.",
        "latitude": 12.7984,
        "longitude": 77.3826,
        "address_line": "Prestige Sunnyside, Bidadi",
        "society_name": "Prestige Sunnyside RWA",
        "gate_instructions": "Basement Pillar 12. Show Gate Pass at Gate 2.",
        "node_type": NodeType.P2P_RWA,
        "connector_type": ConnectorType.SOCKET_15A,
        "power_output_kw": 3.3,
        "is_smart_iot": True,
        "price_per_kwh": Decimal("9.00"),
        "parking_fee_per_hr": Decimal("15.00"),
        "instant_book_enabled": True,
        "min_driver_rating": 4.0,
        "status": NodeStatus.AVAILABLE,
        "amenities": ["CCTV", "SECURITY_GUARD", "COVERED_PARKING"],
        "photos": ["https://images.unsplash.com/photo-1617788138017-80ad40651399?w=600"],
    },
    {
        "title": "Ramanagara Expressway Midway 60kW DC",
        "description": "Dual CCS2 Fast charging guns on the expressway service road.",
        "latitude": 12.7214,
        "longitude": 77.2812,
        "address_line": "NH 275 Km 42, Ramanagara",
        "society_name": "Midway Express Mall",
        "gate_instructions": "Direct open access from expressway exit.",
        "node_type": NodeType.PUBLIC_DC,
        "connector_type": ConnectorType.CCS2,
        "power_output_kw": 60.0,
        "is_smart_iot": True,
        "price_per_kwh": Decimal("19.50"),
        "parking_fee_per_hr": Decimal("0.00"),
        "instant_book_enabled": False,
        "min_driver_rating": 3.0,
        "status": NodeStatus.AVAILABLE,
        "amenities": ["CAFE", "WASHROOM", "KIDS_PLAY_AREA"],
        "photos": ["https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600"],
    }
]

async def seed_database():
    logger.info("⚡ Seeding VoltMate charging nodes and default community hosts...")
    async with async_session_maker() as session:
        # Create default verified host
        host_user = User(
            full_name="Arun Kumar (Verified Host)",
            email="host.arun@voltmate.org",
            active_role=UserRole.HOST,
            kyc_verified=True,
            trust_score=4.9,
            volt_credits_balance=2500.0,
            upi_id="arun.voltmate@okaxis"
        )
        session.add(host_user)
        await session.flush()

        for item in SEED_NODES:
            pt_wkt = f"SRID=4326;POINT({item['longitude']} {item['latitude']})"
            node = ChargingNode(
                host_id=host_user.id if item["node_type"] != NodeType.PUBLIC_DC else None,
                node_type=item["node_type"],
                title=item["title"],
                description=item["description"],
                location=pt_wkt,
                address_line=item["address_line"],
                society_name=item["society_name"],
                gate_instructions=item["gate_instructions"],
                connector_type=item["connector_type"],
                power_output_kw=item["power_output_kw"],
                is_smart_iot=item["is_smart_iot"],
                iot_device_id=item.get("iot_device_id"),
                price_per_kwh=item["price_per_kwh"],
                parking_fee_per_hr=item["parking_fee_per_hr"],
                instant_book_enabled=item["instant_book_enabled"],
                min_driver_rating=item["min_driver_rating"],
                status=item["status"],
                amenities=item["amenities"],
                photos=item["photos"]
            )
            session.add(node)

        await session.commit()
        logger.info(f"Seeded {len(SEED_NODES)} community charging points successfully.")

if __name__ == "__main__":
    asyncio.run(seed_database())

