const express = require("express");
const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { input, output } = req.body;

    const prompt = `You are an AI energy efficiency expert. Analyze this and give 3 short sentences: 1) Is this acceptable or concerning? 2) Biggest optimization opportunity. 3) One action to take today.

Config: ${input.model_type} ${input.model_size} on ${input.hardware}, ${input.region}, ${input.renewable_pct}% renewable, PUE ${input.datacenter_pue}.
Results: ${output.total_kwh.toFixed(2)} kWh, ${output.co2_kg.toFixed(2)} kg CO2, $${output.cost_usd.toFixed(2)}, score ${output.efficiency_score}/100.

No bullet points, plain sentences only.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300
      })
    });

    const data = await response.json();
    const insight = data.choices?.[0]?.message?.content || "No insight available.";
    res.json({ success: true, insight });

  } catch (err) {
    next(err);
  }
});

module.exports = router;