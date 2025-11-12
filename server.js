// ================================
// MQTT + Node.js API Server
// ================================

const express = require("express");
const mqtt = require("mqtt");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ---------- MQTT CONFIG ----------
const MQTT_BROKER = "mqtt://broker.hivemq.com"; // ใช้ broker สาธารณะ
const MQTT_TOPIC_SENSOR = "esp32/sensor";
const MQTT_TOPIC_COMMAND = "esp32/command";

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
      const data = JSON.parse(message.toString());
      console.log("📩 Sensor data:", data);
      latestData = data;
    } catch (err) {
      console.error("⚠️ Error parsing message:", err);
    }
  }
});

// ---------- REST API ----------
app.get("/", (req, res) => {
  res.send("🚀 MQTT + Node.js Server is running!");
});

// ดึงค่าล่าสุดจาก ESP32 (ผ่าน MQTT)
app.get("/api/sensor", (req, res) => {
  res.json(latestData);
});

// ส่งคำสั่งจาก frontend → MQTT → ESP32
app.post("/api/command", (req, res) => {
  const command = req.body;
  console.log("📤 Sending command:", command);
  mqttClient.publish(MQTT_TOPIC_COMMAND, JSON.stringify(command));
  res.json({ status: "sent", command });
});

// ---------- SERVER RUN ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
