const express = require("express");
const mqtt = require("mqtt");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ---------- MQTT CONFIG ----------
const MQTT_BROKER = "mqtt://broker.hivemq.com"; // broker สาธารณะ

// กำหนด topic ต่าง ๆ
const MQTT_TOPIC_STATUS = "/Status";   // ESP32 ส่งสถานะ (1/0)
const MQTT_TOPIC_TEMP = "tempjee";     // ESP32 ส่งอุณหภูมิ
const MQTT_TOPIC_HUMI = "humijee";     // ESP32 ส่งความชื้น
const MQTT_TOPIC_COMMAND = "/esp_c";   // Node.js ส่งคำสั่ง

console.log("Connecting to MQTT Broker:", MQTT_BROKER);
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on("connect", () => {
  console.log("✅ Connected to MQTT broker");

  // subscribe ทุก topic ที่ต้องการ
  const topics = [MQTT_TOPIC_STATUS, MQTT_TOPIC_TEMP, MQTT_TOPIC_HUMI];
  mqttClient.subscribe(topics, (err) => {
    if (err) console.error("❌ Subscribe error:", err);
    else console.log("📡 Subscribed to:", topics.join(", "));
  });
});

mqttClient.on("error", (err) => {
  console.error("❌ MQTT Connection Error:", err);
});

// เก็บค่าล่าสุดของแต่ละ topic
let latestData = {
  status: null,
  temperature: null,
  humidity: null
};

// ---------- MQTT MESSAGE HANDLER ----------
mqttClient.on("message", (topic, message) => {
  const dataStr = message.toString().trim();
  console.log(`📩 [${topic}] ${dataStr}`);

  try {
    if (topic === MQTT_TOPIC_STATUS) {
      // แปลงเป็นตัวเลข 1/0
      latestData.status = (dataStr === "1" || dataStr === "0") ? Number(dataStr) : dataStr;
    } else if (topic === MQTT_TOPIC_TEMP) {
      latestData.temperature = parseFloat(dataStr);
    } else if (topic === MQTT_TOPIC_HUMI) {
      latestData.humidity = parseFloat(dataStr);
    }
  } catch (err) {
    console.error("⚠️ Error parsing MQTT message:", err);
  }
});

// ---------- REST API ----------
app.get("/", (req, res) => {
  res.send("🚀 MQTT + Node.js Server is running! OK");
});

// ดึงข้อมูล sensor ล่าสุดทั้งหมด
app.get("/api/sensor", (req, res) => {
  res.json(latestData);
});

// ส่งคำสั่ง ON/OFF
app.post("/api/command", (req, res) => {
  const { value } = req.body;
  if (!value) return res.status(400).json({ status: "error", error: "No value provided" });

  console.log("📤 Sending command:", value);
  mqttClient.publish(MQTT_TOPIC_COMMAND, value, (err) => {
    if (err) {
      console.error("❌ Publish error:", err);
      res.status(500).json({ status: "error", error: err.message });
    } else {
      console.log("✅ Command published");
      res.json({ status: "sent", value });
    }
  });
});

// ---------- SERVER RUN ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

