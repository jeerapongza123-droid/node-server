const express = require("express");
const mqtt = require("mqtt");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ---------- MQTT CONFIG ----------
const MQTT_BROKER = "mqtt://broker.hivemq.com"; // broker สาธารณะ
const MQTT_TOPIC_SENSOR = "/Status"; // ESP32 ส่งสถานะ
const MQTT_TOPIC_COMMAND = "siv";    // Node.js ส่งคำสั่ง

console.log("Connecting to MQTT Broker:", MQTT_BROKER);

const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on("connect", () => {
  console.log("✅ Connected to MQTT broker");
  mqttClient.subscribe(MQTT_TOPIC_SENSOR, (err) => {
    if (!err) console.log("📡 Subscribed to:", MQTT_TOPIC_SENSOR);
  });
});

mqttClient.on("error", (err) => {
  console.error("❌ MQTT Connection Error:", err);
});

let latestData = {}; // เก็บข้อมูล sensor ล่าสุด

mqttClient.on("message", (topic, message) => {
  if (topic === MQTT_TOPIC_SENSOR) {
    try {
      const dataStr = message.toString().trim();
      console.log("📩 Sensor data:", dataStr);
      // แปลงเป็นตัวเลขถ้าเป็น 1/0
      if (dataStr === "0" || dataStr === "1") {
        latestData = Number(dataStr);
      } else {
        latestData = dataStr; // เก็บเป็นข้อความอื่น ๆ
      }
    } catch (err) {
      console.error("⚠️ Error parsing message:", err);
    }
  }
});

// ---------- REST API ----------
app.get("/", (req, res) => {
  res.send("🚀 MQTT + Node.js Server is running! OK");
});

// ดึงค่าล่าสุดจาก ESP32
app.get("/api/sensor", (req, res) => {
  res.json(latestData);
});

// ส่งคำสั่ง ON/OFF แบบข้อความตรง ๆ
app.post("/api/command", (req, res) => {
  const { value } = req.body; // รับ { value: "ON" } หรือ "OFF"
  if (!value) return res.status(400).json({ status: "error", error: "No value provided" });

  console.log("📤 Sending command:", value);
  mqttClient.publish(MQTT_TOPIC_COMMAND, value, (err) => {
    if (err) {
      console.error("❌ Publish error:", err);
      res.status(500).json({ status: "error", error: err });
    } else {
      console.log("✅ Command published");
      res.json({ status: "sent", value });
    }
  });
});

// ---------- SERVER RUN ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
