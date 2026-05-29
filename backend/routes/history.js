// ============================================================
//  WattWise AI  —  GET/DELETE /api/history
//  File: backend/routes/history.js
// ============================================================

const express = require("express");
const router = express.Router();
const Prediction = require("../models/Prediction");

// GET /api/history?limit=20&page=1
router.get("/", async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 20, 100);
    const page   = Math.max(parseInt(req.query.page)   || 1,  1);
    const skip   = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Prediction.find().sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      Prediction.countDocuments(),
    ]);

    res.json({ success: true, data: items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/history/:id
router.delete("/:id", async (req, res, next) => {
  try {
    await Prediction.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/history  (clear all)
router.delete("/", async (_req, res, next) => {
  try {
    await Prediction.deleteMany({});
    res.json({ success: true, message: "History cleared" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
