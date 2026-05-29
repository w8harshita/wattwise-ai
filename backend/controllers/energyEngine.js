// ============================================================
//  WattWise AI  —  Energy Prediction Engine
//  File: backend/controllers/energyEngine.js
// ============================================================

/**
 * GPU/TPU Thermal Design Power (Watts)
 */
const HARDWARE_TDP = {
  "T4":       70,
  "V100":     300,
  "A100":     400,
  "H100":     700,
  "RTX 4090": 450,
  "TPU v4":   170,
};

/**
 * Model size relative compute multiplier (vs 7B baseline)
 */
const SIZE_MULTIPLIER = {
  "1B":   0.5,
  "7B":   1.0,
  "13B":  1.8,
  "30B":  4.0,
  "70B":  9.0,
  "175B": 22.0,
  "540B": 65.0,
};

/**
 * Grid carbon intensity (kg CO₂ / kWh) by region
 * Source: IEA 2023 data
 */
const CARBON_INTENSITY = {
  "India":     0.82,
  "USA":       0.38,
  "EU":        0.23,
  "China":     0.61,
  "UK":        0.23,
  "Singapore": 0.41,
  "Australia": 0.70,
};

/**
 * Model type efficiency factor
 */
const MODEL_TYPE_FACTOR = {
  llm:         1.0,
  vision:      0.8,
  diffusion:   1.4,
  rl:          0.6,
  transformer: 1.0,
};

/**
 * Water usage factor (liters / kWh) — cooling overhead
 */
const WATER_PER_KWH = 1.8;

/**
 * Average electricity cost (USD / kWh) — global cloud avg
 */
const COST_PER_KWH = 0.08;

// ────────────────────────────────────────────────────────────

/**
 * Core prediction function.
 *
 * @param {Object} params - Input parameters
 * @param {string} params.model_type        - llm | vision | diffusion | rl | transformer
 * @param {string} params.model_size        - 1B | 7B | 13B | 30B | 70B | 175B | 540B
 * @param {string} params.hardware          - GPU/TPU name
 * @param {number} params.batch_size        - Batch size (1–512)
 * @param {number} params.sequence_length   - Token sequence length (64–4096)
 * @param {number} params.training_hours    - Training duration in hours
 * @param {number} params.inference_requests - Number of inference calls
 * @param {number} params.datacenter_pue    - PUE overhead (1.0–2.5)
 * @param {string} params.region            - Geographic region
 * @param {number} params.renewable_pct     - % renewable energy (0–100)
 * @returns {Object} Comprehensive prediction result
 */
function predict(params) {
  const {
    model_type        = "llm",
    model_size        = "7B",
    hardware          = "A100",
    batch_size        = 32,
    sequence_length   = 512,
    training_hours    = 10,
    inference_requests = 1000,
    datacenter_pue    = 1.2,
    region            = "India",
    renewable_pct     = 20,
  } = params;

  // Lookup constants
  const tdp         = HARDWARE_TDP[hardware]          || 300;
  const sizeMul     = SIZE_MULTIPLIER[model_size]     || 1.0;
  const typeFactor  = MODEL_TYPE_FACTOR[model_type]   || 1.0;
  const carbonFactor = CARBON_INTENSITY[region]       || 0.50;
  const renewFrac   = Math.max(0, Math.min(100, renewable_pct)) / 100;

  // ── Training Energy (kWh) ──────────────────────────────────
  // Formula: TDP × hours × size_factor × type_factor × batch_factor / normalization
  const batchFactor       = batch_size / 32;                          // normalized to batch=32
  const trainingKwhRaw    = (tdp / 1000) * training_hours * sizeMul * typeFactor * batchFactor;
  const trainingKwh       = trainingKwhRaw * datacenter_pue;

  // ── Inference Energy (kWh) ─────────────────────────────────
  // Formula: TDP × requests × seq_factor / scale_constant × type_factor
  const seqFactor         = sequence_length / 512;                    // normalized to seq=512
  const inferenceKwhRaw   = (tdp / 1000) * (inference_requests / 1e4) * seqFactor * sizeMul * typeFactor;
  const inferenceKwh      = inferenceKwhRaw * datacenter_pue;

  // ── Totals ─────────────────────────────────────────────────
  const totalKwh          = trainingKwh + inferenceKwh;

  // ── Emissions (kg CO₂) ─────────────────────────────────────
  const co2Kg             = totalKwh * carbonFactor * (1 - renewFrac);
  const renewableSavedKg  = totalKwh * carbonFactor * renewFrac;      // CO₂ avoided

  // ── Cost (USD) ─────────────────────────────────────────────
  const costUsd           = totalKwh * COST_PER_KWH;

  // ── Water Usage (liters) ───────────────────────────────────
  const waterLiters       = totalKwh * WATER_PER_KWH;

  // ── Efficiency Score (0–100) ───────────────────────────────
  // Higher score = more energy efficient. Penalizes large consumption,
  // rewards renewables and efficient hardware.
  const rawPenalty        = Math.log10(Math.max(1, totalKwh)) * 12;
  const renewableBonus    = renewFrac * 15;
  const hwBonus           = hardware === "H100" ? 5 : hardware === "T4" ? 8 : 0;
  const efficiencyScore   = Math.max(0, Math.min(100, 100 - rawPenalty + renewableBonus + hwBonus));

  // ── Equivalent metrics (for display) ──────────────────────
  const equivalents = {
    km_driven:        (co2Kg / 0.21).toFixed(0),         // avg car: 210g CO₂/km
    phone_charges:    (totalKwh * 1000 / 12).toFixed(0), // ~12 Wh per charge
    trees_to_offset:  (co2Kg / 21).toFixed(1),           // avg tree: 21 kg CO₂/year
  };

  return {
    // Energy breakdown
    total_kwh:      +totalKwh.toFixed(4),
    training_kwh:   +trainingKwh.toFixed(4),
    inference_kwh:  +inferenceKwh.toFixed(4),

    // Emissions
    co2_kg:             +co2Kg.toFixed(4),
    renewable_impact:   +renewableSavedKg.toFixed(4),
    carbon_intensity:   carbonFactor,

    // Cost & water
    cost_usd:       +costUsd.toFixed(4),
    water_liters:   +waterLiters.toFixed(2),

    // Score
    efficiency_score: +efficiencyScore.toFixed(2),

    // Human equivalents
    equivalents,

    // Meta
    hardware_tdp:   tdp,
    size_multiplier: sizeMul,
    computed_at:    new Date().toISOString(),
  };
}

module.exports = { predict, HARDWARE_TDP, SIZE_MULTIPLIER, CARBON_INTENSITY };
