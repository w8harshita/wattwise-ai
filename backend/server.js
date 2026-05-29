// ============================================================
//  WattWise AI  —  Backend Server  (Node.js + Express)
//  File: backend/server.js
// ============================================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");

const predictRouter = require("./routes/predict");
const historyRouter = require("./routes/history");
const insightRouter = require("./routes/insight");
const compareRouter = require("./routes/compare");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(morgan("combined"));
app.use(express.json({ limit: "10kb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 100,
  message: { error: "Too many requests — please try again later." }
});
app.use("/api", limiter);

// ── Routes ──────────────────────────────────────────────────
app.use("/api/predict",  predictRouter);
app.use("/api/history",  historyRouter);
app.use("/api/insight",  insightRouter);
app.use("/api/compare",  compareRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" });
});

// ── Error Handler ───────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

// ── Database + Start ────────────────────────────────────────
const start = async () => {
  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("✅ MongoDB connected");
    } else {
      console.warn("⚠️  No MONGO_URI — running without persistence");
    }
    app.listen(PORT, () => console.log(`🚀 WattWise server running on http://localhost:${PORT}`));
  } catch (err) {
    console.error("Failed to start:", err);
    process.exit(1);
  }
};

start();
module.exports = app;
