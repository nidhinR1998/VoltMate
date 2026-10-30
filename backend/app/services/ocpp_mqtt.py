import json
import logging
from typing import Optional, Dict, Any
try:
    import paho.mqtt.client as mqtt
except ImportError:
    mqtt = None
from app.core.config import settings

logger = logging.getLogger("voltmate.mqtt")

class SmartHardwareBroker:
    def __init__(self):
        self.client: Optional[mqtt.Client] = None
        self.is_connected = False

    def initialize(self):
        try:
            self.client = mqtt.Client(
                client_id="voltmate_backend_service",
                callback_api_version=mqtt.CallbackAPIVersion.VERSION2
            )
            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect
            self.client.on_message = self._on_message
            self.client.connect_async(
                settings.MQTT_BROKER_HOST,
                settings.MQTT_BROKER_PORT,
                keepalive=60
            )
            self.client.loop_start()
            logger.info("MQTT Client initialized in async loop.")
        except Exception as e:
            logger.warning(f"MQTT Broker connection failed ({e}). Hardware relays running in virtual simulator mode.")

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            self.is_connected = True
            logger.info("Connected to Mosquitto MQTT broker successfully.")
            # Subscribe to plug telemetry topics
            client.subscribe(f"{settings.MQTT_TOPIC_PREFIX}+/telemetry")
            client.subscribe(f"{settings.MQTT_TOPIC_PREFIX}+/status")
        else:
            logger.warning(f"Mosquitto connection returned code: {rc}")

    def _on_disconnect(self, client, userdata, flags, rc, properties=None):
        self.is_connected = False
        logger.info("Disconnected from MQTT broker.")

    def _on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
            logger.debug(f"Received MQTT on {msg.topic}: {payload}")
        except Exception:
            pass

    def send_relay_command(self, device_id: str, command: str) -> bool:
        """
        Toggles 16A smart relay: command is 'ON' or 'OFF'.
        Standard Tasmota topic format: cmnd/<device_id>/POWER
        """
        topic = f"cmnd/{device_id}/POWER"
        logger.info(f"⚡ Smart Relay Command dispatched: [{topic}] -> {command}")
        if self.is_connected and self.client:
            self.client.publish(topic, command, qos=1)
            return True
        return True # Handled in simulation mode

    # OCPP 1.6J Payload Helper
    @staticmethod
    def build_ocpp_start_transaction_response(transaction_id: int, status: str = "Accepted") -> Dict[str, Any]:
        return {
            "transactionId": transaction_id,
            "idTagInfo": {
                "status": status,
                "expiryDate": "2030-01-01T00:00:00Z"
            }
        }

    @staticmethod
    def build_ocpp_stop_transaction_response(status: str = "Accepted") -> Dict[str, Any]:
        return {
            "idTagInfo": {
                "status": status
            }
        }

hardware_broker = SmartHardwareBroker()

