// ============================================================
//  WattWise AI  —  POST /api/predict
//  File: backend/routes/predict.js
// ============================================================

const express = require("express");
const router = express.Router();
const { predict } = require("../controllers/energyEngine");
const Prediction = require("../models/Prediction");

/**
 * Validate incoming prediction request body.
 * Returns { valid: bool, errors: string[] }
 */
function validate(body) {
  const errors = [];
  const VALID_TYPES     = ["llm","vision","diffusion","rl","transformer"];
  const VALID_SIZES     = ["1B","7B","13B","30B","70B","175B","540B"];
  const VALID_HARDWARE  = ["T4","V100","A100","H100","RTX 4090","TPU v4"];
  const VALID_REGIONS   = ["India","USA","EU","China","UK","Singapore","Australia"];

  if (!VALID_TYPES.includes(body.model_type))     errors.push(`model_type must be one of: ${VALID_TYPES.join(", ")}`);
  if (!VALID_SIZES.includes(body.model_size))     errors.push(`model_size must be one of: ${VALID_SIZES.join(", ")}`);
  if (!VALID_HARDWARE.includes(body.hardware))    errors.push(`hardware must be one of: ${VALID_HARDWARE.join(", ")}`);
  if (!VALID_REGIONS.includes(body.region))       errors.push(`region must be one of: ${VALID_REGIONS.join(", ")}`);

  if (body.batch_size < 1 || body.batch_size > 512)         errors.push("batch_size must be 1–512");
  if (body.sequence_length < 64 || body.sequence_length > 4096) errors.push("sequence_length must be 64–4096");
  if (body.training_hours < 0 || body.training_hours > 8760)   errors.push("training_hours must be 0–8760");
  if (body.inference_requests < 0)                          errors.push("inference_requests must be >= 0");
  if (body.datacenter_pue < 1.0 || body.datacenter_pue > 2.5)  errors.push("datacenter_pue must be 1.0–2.5");
  if (body.renewable_pct < 0 || body.renewable_pct > 100)      errors.push("renewable_pct must be 0–100");

  return { valid: errors.length === 0, errors };
}

// POST /api/predict
router.post("/", async (req, res, next) => {
  try {
    const { valid, errors } = validate(req.body);
    if (!valid) return res.status(400).json({ success: false, errors });

    const result = predict(req.body);

    // Persist to DB if connected
    try {
      const doc = new Prediction({ input: req.body, output: result });
      await doc.save();
    } catch (_) { /* DB offline — non-fatal */ }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
