// ============================================================
//  WattWise AI  —  Prediction Schema (MongoDB / Mongoose)
//  File: backend/models/Prediction.js
// ============================================================

const mongoose = require("mongoose");

const inputSchema = new mongoose.Schema({
  model_type:         { type: String, required: true },
  model_size:         { type: String, required: true },
  hardware:           { type: String, required: true },
  batch_size:         { type: Number, required: true },
  sequence_length:    { type: Number, required: true },
  training_hours:     { type: Number, required: true },
  inference_requests: { type: Number, required: true },
  datacenter_pue:     { type: Number, required: true },
  region:             { type: String, required: true },
  renewable_pct:      { type: Number, required: true },
}, { _id: false });

const outputSchema = new mongoose.Schema({
  total_kwh:        Number,
  training_kwh:     Number,
  inference_kwh:    Number,
  co2_kg:           Number,
  renewable_impact: Number,
  carbon_intensity: Number,
  cost_usd:         Number,
  water_liters:     Number,
  efficiency_score: Number,
  equivalents:      mongoose.Schema.Types.Mixed,
  computed_at:      String,
}, { _id: false });

const predictionSchema = new mongoose.Schema(
  {
    input:  { type: inputSchema,  required: true },
    output: { type: outputSchema, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "predictions",
  }
);

// Index for quick history retrieval
predictionSchema.index({ created_at: -1 });

module.exports = mongoose.model("Prediction", predictionSchema);
