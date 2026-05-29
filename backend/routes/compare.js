// ============================================================
//  WattWise AI  —  GET /api/compare
//  Returns hardware comparison table with energy benchmarks
//  File: backend/routes/compare.js
// ============================================================

const express = require("express");
const router = express.Router();
const { predict } = require("../controllers/energyEngine");

const HARDWARE_LIST = ["T4", "V100", "A100", "H100", "RTX 4090", "TPU v4"];

// Shared benchmark config (fixed workload for fair comparison)
const BENCHMARK = {
  model_type: "llm",
  model_size: "7B",
  batch_size: 32,
  sequence_length: 512,
  training_hours: 10,
  inference_requests: 10000,
  datacenter_pue: 1.2,
  region: "India",
  renewable_pct: 0,
};

// GET /api/compare
router.get("/", (_req, res) => {
  const results = HARDWARE_LIST.map((hw) => {
    const r = predict({ ...BENCHMARK, hardware: hw });
    return {
      hardware: hw,
      total_kwh: r.total_kwh,
      co2_kg: r.co2_kg,
      efficiency_score: r.efficiency_score,
      tdp_watts: r.hardware_tdp,
    };
  });

  // Sort by efficiency score descending
  results.sort((a, b) => b.efficiency_score - a.efficiency_score);
  res.json({ success: true, data: results, benchmark_config: BENCHMARK });
});

module.exports = router;
