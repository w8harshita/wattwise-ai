import { useState, useEffect, useRef } from "react";

const API_BASE = "http://localhost:5000/api";

// ─── Utility ────────────────────────────────────────────────────────────────
const fmt = (n, decimals = 2) =>
  Number(n).toLocaleString("en-IN", { maximumFractionDigits: decimals });

// ─── Sparkline ──────────────────────────────────────────────────────────────
function Sparkline({ data, color = "#00ff88", height = 40 }) {
  if (!data || data.length < 2) return null;
  const w = 200, h = height;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Gauge ───────────────────────────────────────────────────────────────────
function Gauge({ value, max, label, color }) {
  const pct = Math.min(value / max, 1);
  const angle = pct * 180;
  const r = 70;
  const cx = 90, cy = 90;
  const rad = (deg) => (deg * Math.PI) / 180;
  const x = cx + r * Math.cos(rad(180 - angle));
  const y = cy - r * Math.sin(rad(180 - angle));
  const largeArc = angle > 180 ? 1 : 0;

  return (
    <svg viewBox="0 0 180 100" style={{ width: "100%" }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#1a1a2e" strokeWidth="12" strokeLinecap="round" />
      {pct > 0 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}`}
          fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" />
      )}
      <circle cx={x} cy={y} r="5" fill="white" />
      <text x={cx} y={cy - 10} textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">
        {fmt(value, 1)}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#888" fontSize="10">
        {label}
      </text>
    </svg>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [aiInsight, setAiInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [form, setForm] = useState({
    model_type: "llm",
    model_size: "7B",
    hardware: "A100",
    batch_size: 32,
    sequence_length: 512,
    training_hours: 10,
    inference_requests: 1000,
    datacenter_pue: 1.2,
    region: "India",
    renewable_pct: 20,
  });

  const MODEL_TYPES = ["llm", "vision", "diffusion", "rl", "transformer"];
  const MODEL_SIZES = ["1B", "7B", "13B", "30B", "70B", "175B", "540B"];
  const HARDWARE = ["T4", "V100", "A100", "H100", "RTX 4090", "TPU v4"];
  const REGIONS = ["India", "USA", "EU", "China", "UK", "Singapore", "Australia"];

  // Simulated prediction engine (mirrors backend logic)
  const simulatePredict = (f) => {
    const hwTDP = { T4: 70, V100: 300, A100: 400, H100: 700, "RTX 4090": 450, "TPU v4": 170 };
    const sizeMultiplier = { "1B": 0.5, "7B": 1, "13B": 1.8, "30B": 4, "70B": 9, "175B": 22, "540B": 65 };
    const tdp = hwTDP[f.hardware] || 300;
    const sm = sizeMultiplier[f.model_size] || 1;
    const trainingEnergy = (tdp * f.training_hours * sm * f.batch_size) / (1000 * 32);
    const inferenceEnergy = (tdp * f.inference_requests * f.sequence_length) / (1e6 * 100);
    const totalKwh = (trainingEnergy + inferenceEnergy) * f.datacenter_pue;
    const co2Factor = { India: 0.82, USA: 0.38, EU: 0.23, China: 0.61, UK: 0.23, Singapore: 0.41, Australia: 0.7 };
    const co2 = totalKwh * (co2Factor[f.region] || 0.5) * (1 - f.renewable_pct / 100);
    const cost = totalKwh * 0.08;
    const waterL = totalKwh * 1.8;
    const score = Math.max(0, 100 - (totalKwh / 100) * 15 - (f.renewable_pct > 50 ? -10 : 0));
    return {
      total_kwh: totalKwh,
      training_kwh: trainingEnergy * f.datacenter_pue,
      inference_kwh: inferenceEnergy * f.datacenter_pue,
      co2_kg: co2,
      cost_usd: cost,
      water_liters: waterL,
      efficiency_score: Math.min(100, score),
      carbon_intensity: co2Factor[f.region] || 0.5,
      renewable_impact: (totalKwh * co2Factor[f.region] * f.renewable_pct) / 100,
    };
  };

  const handlePredict = async () => {
    setLoading(true);
    setAiInsight("");
    await new Promise((r) => setTimeout(r, 900));
    const res = simulatePredict(form);
    setResult(res);
    const entry = { ...form, ...res, timestamp: new Date().toISOString(), id: Date.now() };
    setHistory((h) => [entry, ...h].slice(0, 20));
    setLoading(false);
    fetchAiInsight(form, res);
  };

  const fetchAiInsight = async (f, r) => {
    setInsightLoading(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are an AI energy efficiency expert. Analyze this AI model's energy consumption and provide actionable insights.

Model Config:
- Type: ${f.model_type}, Size: ${f.model_size}
- Hardware: ${f.hardware}, Region: ${f.region}
- Batch Size: ${f.batch_size}, Seq Length: ${f.sequence_length}
- Training Hours: ${f.training_hours}h, Inference Requests: ${f.inference_requests}
- Renewable Energy: ${f.renewable_pct}%

Results:
- Total Energy: ${r.total_kwh.toFixed(2)} kWh
- CO₂ Emissions: ${r.co2_kg.toFixed(2)} kg
- Cost: $${r.cost_usd.toFixed(2)}
- Water Usage: ${r.water_liters.toFixed(1)} L
- Efficiency Score: ${r.efficiency_score.toFixed(0)}/100

Give a 3-4 sentence expert analysis focusing on:
1. Whether this consumption level is concerning or acceptable
2. The biggest optimization opportunity
3. One specific actionable recommendation

Keep it concise, technical, and practical. No bullet points, just flowing paragraphs.`
          }]
        })
      });
      const data = await response.json();
      const text = data.content?.map(c => c.text || "").join("") || "";
      setAiInsight(text);
    } catch (e) {
      setAiInsight("AI insight unavailable. Check your API connectivity.");
    }
    setInsightLoading(false);
  };

  const inp = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.type === "range" ? +e.target.value : e.target.value }));
  const scoreColor = result ? (result.efficiency_score > 70 ? "#00ff88" : result.efficiency_score > 40 ? "#ffaa00" : "#ff4466") : "#00ff88";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050510",
      color: "#e0e0ff",
      fontFamily: "'Courier New', monospace",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Animated grid background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,80,255,0.08) 0%, transparent 70%)",
        pointerEvents: "none"
      }} />

      {/* Header */}
      <header style={{
        position: "relative", zIndex: 10,
        borderBottom: "1px solid rgba(0,255,136,0.15)",
        background: "rgba(5,5,16,0.9)",
        backdropFilter: "blur(20px)",
        padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 64
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "linear-gradient(135deg, #00ff88, #0050ff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18
          }}>⚡</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2, color: "#00ff88" }}>WATTWISE AI</div>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: 3 }}>ENERGY CONSUMPTION PREDICTOR</div>
          </div>
        </div>

        <nav style={{ display: "flex", gap: 4 }}>
          {[
            { id: "dashboard", label: "⬡ PREDICT" },
            { id: "history", label: "◈ HISTORY" },
            { id: "compare", label: "⊞ COMPARE" },
            { id: "about", label: "◉ ABOUT" },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setPage(id)} style={{
              background: page === id ? "rgba(0,255,136,0.1)" : "transparent",
              border: page === id ? "1px solid rgba(0,255,136,0.4)" : "1px solid transparent",
              color: page === id ? "#00ff88" : "#556",
              padding: "6px 14px", borderRadius: 4, cursor: "pointer",
              fontSize: 11, letterSpacing: 1.5, transition: "all 0.2s",
              fontFamily: "inherit"
            }}>{label}</button>
          ))}
        </nav>
      </header>

      {/* Pages */}
      <main style={{ position: "relative", zIndex: 5, padding: "32px 32px 64px" }}>

        {/* ── PREDICT PAGE ── */}
        {page === "dashboard" && (
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{
                fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 900,
                letterSpacing: -1, margin: 0,
                background: "linear-gradient(90deg, #00ff88 0%, #0088ff 50%, #aa44ff 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
              }}>
                AI ENERGY CONSUMPTION PREDICTOR
              </h1>
              <p style={{ color: "#556", marginTop: 8, fontSize: 13, letterSpacing: 1 }}>
                ESTIMATE POWER, CARBON & COST FOR YOUR AI WORKLOADS
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* Form */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Model Config */}
                <Card title="MODEL CONFIGURATION" icon="🧠">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <FormField label="MODEL TYPE">
                      <Select value={form.model_type} onChange={inp("model_type")} options={MODEL_TYPES} />
                    </FormField>
                    <FormField label="PARAMETER SIZE">
                      <Select value={form.model_size} onChange={inp("model_size")} options={MODEL_SIZES} />
                    </FormField>
                    <FormField label="HARDWARE">
                      <Select value={form.hardware} onChange={inp("hardware")} options={HARDWARE} />
                    </FormField>
                    <FormField label="REGION">
                      <Select value={form.region} onChange={inp("region")} options={REGIONS} />
                    </FormField>
                  </div>
                </Card>

                {/* Workload Config */}
                <Card title="WORKLOAD PARAMETERS" icon="⚙️">
                  <SliderField label="BATCH SIZE" value={form.batch_size} min={1} max={512} step={1} onChange={inp("batch_size")} color="#00ff88" />
                  <SliderField label="SEQUENCE LENGTH" value={form.sequence_length} min={64} max={4096} step={64} onChange={inp("sequence_length")} color="#0088ff" />
                  <SliderField label="TRAINING HOURS" value={form.training_hours} min={0} max={720} step={1} onChange={inp("training_hours")} color="#ffaa00" />
                  <SliderField label="INFERENCE REQUESTS" value={form.inference_requests} min={100} max={1000000} step={100} onChange={inp("inference_requests")} color="#aa44ff" />
                </Card>

                {/* Energy Config */}
                <Card title="ENERGY PROFILE" icon="🔋">
                  <SliderField label="DATA CENTER PUE" value={form.datacenter_pue} min={1.0} max={2.5} step={0.05} onChange={inp("datacenter_pue")} color="#00ffff" decimals={2} />
                  <SliderField label="RENEWABLE ENERGY %" value={form.renewable_pct} min={0} max={100} step={1} onChange={inp("renewable_pct")} color="#00ff88" />
                </Card>

                {/* Predict Button */}
                <button onClick={handlePredict} disabled={loading} style={{
                  background: loading ? "#111" : "linear-gradient(135deg, #00ff88, #0050ff)",
                  border: "none", color: loading ? "#555" : "#000",
                  padding: "18px 32px", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer",
                  fontSize: 14, fontWeight: 900, letterSpacing: 3,
                  fontFamily: "inherit", transition: "all 0.3s",
                  boxShadow: loading ? "none" : "0 0 30px rgba(0,255,136,0.3)"
                }}>
                  {loading ? "⏳ COMPUTING..." : "⚡ PREDICT ENERGY CONSUMPTION"}
                </button>
              </div>

              {/* Results */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {result ? (
                  <>
                    {/* Score Gauge */}
                    <Card title="EFFICIENCY SCORE" icon="📊">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
                        <div>
                          <Gauge value={result.efficiency_score} max={100} label="/ 100" color={scoreColor} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {[
                            { label: "TOTAL ENERGY", value: `${fmt(result.total_kwh)} kWh`, color: "#0088ff" },
                            { label: "TRAINING", value: `${fmt(result.training_kwh)} kWh`, color: "#aa44ff" },
                            { label: "INFERENCE", value: `${fmt(result.inference_kwh)} kWh`, color: "#ffaa00" },
                          ].map(({ label, value, color }) => (
                            <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "8px 12px", borderLeft: `2px solid ${color}` }}>
                              <div style={{ fontSize: 9, color: "#556", letterSpacing: 2 }}>{label}</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>

                    {/* Impact Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <ImpactCard icon="🌍" label="CO₂ EMISSIONS" value={`${fmt(result.co2_kg)} kg`} sub="carbon dioxide" color="#ff4466" />
                      <ImpactCard icon="💰" label="ESTIMATED COST" value={`$${fmt(result.cost_usd)}`} sub="USD @ $0.08/kWh" color="#ffaa00" />
                      <ImpactCard icon="💧" label="WATER USAGE" value={`${fmt(result.water_liters)} L`} sub="cooling water" color="#00aaff" />
                      <ImpactCard icon="♻️" label="RENEWABLE SAVED" value={`${fmt(result.renewable_impact)} kg`} sub="CO₂ offset" color="#00ff88" />
                    </div>

                    {/* AI Insight */}
                    <Card title="AI ANALYSIS" icon="🤖">
                      {insightLoading ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#556", fontSize: 13 }}>
                          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                          Generating expert analysis...
                        </div>
                      ) : aiInsight ? (
                        <p style={{ fontSize: 13, lineHeight: 1.7, color: "#aac", margin: 0, borderLeft: "2px solid #0088ff", paddingLeft: 12 }}>
                          {aiInsight}
                        </p>
                      ) : null}
                    </Card>

                    {/* Breakdown Bar */}
                    <Card title="ENERGY BREAKDOWN" icon="📈">
                      <EnergyBar training={result.training_kwh} inference={result.inference_kwh} total={result.total_kwh} />
                    </Card>
                  </>
                ) : (
                  <div style={{
                    height: "100%", minHeight: 400,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    border: "1px dashed rgba(0,255,136,0.1)",
                    borderRadius: 12, gap: 16, color: "#333"
                  }}>
                    <div style={{ fontSize: 64 }}>⚡</div>
                    <div style={{ fontSize: 14, letterSpacing: 2, color: "#334" }}>CONFIGURE & PREDICT</div>
                    <div style={{ fontSize: 12, color: "#223", textAlign: "center", maxWidth: 240 }}>
                      Set your model parameters on the left and click PREDICT to analyze energy consumption.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY PAGE ── */}
        {page === "history" && (
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <SectionTitle title="PREDICTION HISTORY" sub="PAST COMPUTATIONS AND TREND ANALYSIS" />
            {history.length === 0 ? (
              <EmptyState icon="◈" text="No predictions yet. Run a prediction first." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {history.map((h) => (
                  <HistoryRow key={h.id} item={h} />
                ))}
              </div>
            )}
            {history.length > 1 && (
              <Card title="ENERGY TREND" icon="📉" style={{ marginTop: 24 }}>
                <Sparkline data={history.slice().reverse().map(h => h.total_kwh)} color="#00ff88" height={60} />
                <div style={{ display: "flex", gap: 24, marginTop: 12, fontSize: 12, color: "#556" }}>
                  <span>AVG: <b style={{ color: "#0088ff" }}>{fmt(history.reduce((a, h) => a + h.total_kwh, 0) / history.length)} kWh</b></span>
                  <span>MIN: <b style={{ color: "#00ff88" }}>{fmt(Math.min(...history.map(h => h.total_kwh)))} kWh</b></span>
                  <span>MAX: <b style={{ color: "#ff4466" }}>{fmt(Math.max(...history.map(h => h.total_kwh)))} kWh</b></span>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── COMPARE PAGE ── */}
        {page === "compare" && (
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <SectionTitle title="HARDWARE COMPARISON" sub="ENERGY EFFICIENCY ACROSS GPU/TPU PLATFORMS" />
            <CompareTable />
          </div>
        )}

        {/* ── ABOUT PAGE ── */}
        {page === "about" && (
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <SectionTitle title="ABOUT WATTWISE AI" sub="METHODOLOGY & TECH STACK" />
            <AboutContent />
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #050510; }
        ::-webkit-scrollbar-thumb { background: #00ff8844; border-radius: 2px; }
        select, input { -webkit-appearance: none; }
      `}</style>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Card({ title, icon, children, style }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12, padding: 20,
      animation: "fadeIn 0.3s ease",
      ...style
    }}>
      <div style={{ fontSize: 11, letterSpacing: 2, color: "#556", marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <span>{icon}</span><span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 2, color: "#445", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} style={{
      background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.15)",
      color: "#e0e0ff", padding: "8px 12px", borderRadius: 6, width: "100%",
      fontFamily: "inherit", fontSize: 13, cursor: "pointer", outline: "none"
    }}>
      {options.map(o => <option key={o} value={o} style={{ background: "#050510" }}>{o}</option>)}
    </select>
  );
}

function SliderField({ label, value, min, max, step, onChange, color, decimals = 0 }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, letterSpacing: 2, color: "#445" }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{decimals ? Number(value).toFixed(decimals) : fmt(value, 0)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} style={{
        width: "100%", accentColor: color, height: 4,
        background: `linear-gradient(90deg, ${color} ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 0%)`,
        borderRadius: 2, outline: "none", border: "none"
      }} />
    </div>
  );
}

function ImpactCard({ icon, label, value, sub, color }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${color}22`,
      borderRadius: 10, padding: 14, animation: "fadeIn 0.4s ease"
    }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#445", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "#334", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function EnergyBar({ training, inference, total }) {
  const tPct = total > 0 ? (training / total) * 100 : 50;
  const iPct = total > 0 ? (inference / total) * 100 : 50;
  return (
    <div>
      <div style={{ height: 20, borderRadius: 10, overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${tPct}%`, background: "linear-gradient(90deg, #aa44ff, #0050ff)", transition: "width 0.8s ease" }} />
        <div style={{ width: `${iPct}%`, background: "linear-gradient(90deg, #0050ff, #00ff88)", transition: "width 0.8s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 24, marginTop: 10, fontSize: 12 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "#aa44ff" }} />
          <span style={{ color: "#556" }}>Training <b style={{ color: "#aa44ff" }}>{tPct.toFixed(1)}%</b></span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "#00ff88" }} />
          <span style={{ color: "#556" }}>Inference <b style={{ color: "#00ff88" }}>{iPct.toFixed(1)}%</b></span>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ item }) {
  const scoreColor = item.efficiency_score > 70 ? "#00ff88" : item.efficiency_score > 40 ? "#ffaa00" : "#ff4466";
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
      borderRadius: 10, padding: "14px 20px",
      display: "grid", gridTemplateColumns: "120px 80px 80px 1fr 1fr 1fr 80px",
      gap: 16, alignItems: "center", fontSize: 12
    }}>
      <div>
        <div style={{ color: "#00ff88", fontWeight: 700 }}>{item.model_size} {item.model_type.toUpperCase()}</div>
        <div style={{ color: "#334", fontSize: 10 }}>{item.hardware}</div>
      </div>
      <div><span style={{ color: "#0088ff", fontWeight: 700 }}>{fmt(item.total_kwh)} kWh</span></div>
      <div><span style={{ color: "#ff4466" }}>{fmt(item.co2_kg)} kg CO₂</span></div>
      <div style={{ color: "#556" }}>{item.region}</div>
      <div style={{ color: "#556" }}>${fmt(item.cost_usd)}</div>
      <div style={{ color: "#556" }}>{item.renewable_pct}% renewable</div>
      <div style={{
        background: `${scoreColor}22`, border: `1px solid ${scoreColor}44`,
        borderRadius: 6, padding: "4px 8px", textAlign: "center",
        color: scoreColor, fontWeight: 700, fontSize: 13
      }}>{Math.round(item.efficiency_score)}</div>
    </div>
  );
}

function CompareTable() {
  const hardware = [
    { name: "NVIDIA H100", tdp: 700, flops: "3958 TFLOPS", gen: "Hopper", efficiency: 95 },
    { name: "NVIDIA A100", tdp: 400, flops: "624 TFLOPS", gen: "Ampere", efficiency: 82 },
    { name: "NVIDIA V100", tdp: 300, flops: "125 TFLOPS", gen: "Volta", efficiency: 65 },
    { name: "NVIDIA T4", tdp: 70, flops: "65 TFLOPS", gen: "Turing", efficiency: 88 },
    { name: "RTX 4090", tdp: 450, flops: "82.6 TFLOPS", gen: "Ada", efficiency: 75 },
    { name: "Google TPU v4", tdp: 170, flops: "275 TOPS", gen: "TPU", efficiency: 90 },
  ];
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(0,255,136,0.2)" }}>
            {["HARDWARE", "TDP", "PEAK PERF.", "ARCH", "EFFICIENCY"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 10, letterSpacing: 2, color: "#556" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hardware.map((hw, i) => {
            const ec = hw.efficiency > 85 ? "#00ff88" : hw.efficiency > 70 ? "#ffaa00" : "#ff4466";
            return (
              <tr key={hw.name} style={{
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"
              }}>
                <td style={{ padding: "14px 16px", color: "#e0e0ff", fontWeight: 700 }}>{hw.name}</td>
                <td style={{ padding: "14px 16px", color: "#ff4466" }}>{hw.tdp}W</td>
                <td style={{ padding: "14px 16px", color: "#0088ff" }}>{hw.flops}</td>
                <td style={{ padding: "14px 16px", color: "#556" }}>{hw.gen}</td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ height: 6, width: hw.efficiency * 1.5, background: ec, borderRadius: 3, transition: "width 0.5s" }} />
                    <span style={{ color: ec, fontWeight: 700 }}>{hw.efficiency}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SectionTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, margin: 0, color: "#e0e0ff" }}>{title}</h2>
      <p style={{ color: "#334", fontSize: 11, letterSpacing: 3, marginTop: 4 }}>{sub}</p>
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{
      textAlign: "center", padding: "80px 32px",
      border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 12
    }}>
      <div style={{ fontSize: 48, opacity: 0.2 }}>{icon}</div>
      <p style={{ color: "#334", marginTop: 16, fontSize: 13, letterSpacing: 1 }}>{text}</p>
    </div>
  );
}

function AboutContent() {
  const stack = [
    { layer: "FRONTEND", items: ["React 18", "Vite", "CSS-in-JS"], color: "#00ff88" },
    { layer: "BACKEND", items: ["Node.js + Express", "Python FastAPI (alt)", "REST API"], color: "#0088ff" },
    { layer: "AI ENGINE", items: ["Claude Sonnet 4 API", "Energy ML model", "Carbon DB"], color: "#aa44ff" },
    { layer: "DATA", items: ["MongoDB / PostgreSQL", "Redis cache", "Time-series store"], color: "#ffaa00" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card title="PROJECT OVERVIEW" icon="📡">
        <p style={{ fontSize: 13, lineHeight: 1.8, color: "#99aacc", margin: 0 }}>
          WattWise AI is an open-source tool to estimate and analyze the energy footprint of AI model
          training and inference. By modeling hardware TDP, datacenter PUE, workload characteristics,
          and regional carbon intensity, it gives engineers actionable insights to reduce AI's
          environmental impact — while an integrated Claude AI engine provides expert analysis.
        </p>
      </Card>
      <Card title="TECH STACK" icon="⚙️">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {stack.map(({ layer, items, color }) => (
            <div key={layer} style={{ background: `${color}08`, border: `1px solid ${color}22`, borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color, marginBottom: 8 }}>{layer}</div>
              {items.map(i => <div key={i} style={{ fontSize: 12, color: "#778", padding: "2px 0" }}>→ {i}</div>)}
            </div>
          ))}
        </div>
      </Card>
      <Card title="ENERGY MODEL" icon="🔬">
        <div style={{ fontSize: 12, color: "#667", lineHeight: 1.8 }}>
          <div style={{ marginBottom: 8, color: "#88aacc" }}>Training Energy =</div>
          <code style={{ background: "rgba(0,255,136,0.05)", padding: "8px 12px", borderRadius: 6, display: "block", color: "#00ff88", fontSize: 11 }}>
            (GPU_TDP × hours × size_factor × batch_size) / normalization × PUE
          </code>
          <div style={{ marginTop: 12, marginBottom: 8, color: "#88aacc" }}>Inference Energy =</div>
          <code style={{ background: "rgba(0,136,255,0.05)", padding: "8px 12px", borderRadius: 6, display: "block", color: "#0088ff", fontSize: 11 }}>
            (GPU_TDP × requests × seq_length) / scale_constant × PUE
          </code>
          <p style={{ marginTop: 12, color: "#556" }}>
            CO₂ = Total_kWh × Regional_Carbon_Factor × (1 - renewable_fraction)
          </p>
        </div>
      </Card>
    </div>
  );
}
