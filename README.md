# ⚡ WattWise AI — Energy Consumption Predictor

> Estimate, analyze, and optimize the energy footprint of your AI model training and inference workloads — powered by Claude AI for intelligent recommendations.

![WattWise AI Screenshot](./docs/screenshot.png)

---

## 🚀 Features

- **Energy Prediction** — Estimate kWh for training & inference based on hardware, model size, batch size, and workload
- **Carbon Footprint** — CO₂ emissions using real regional carbon intensity data (IEA 2023)
- **Cost Estimation** — Cloud electricity cost breakdown
- **Water Usage** — Data center cooling water overhead
- **Efficiency Score** — 0–100 score factoring in renewables, hardware efficiency, and workload size
- **AI Analysis** — Claude Sonnet generates expert optimization recommendations for each prediction
- **History & Trends** — Track all predictions with sparkline energy trends
- **Hardware Comparison** — Side-by-side benchmark: T4, V100, A100, H100, RTX 4090, TPU v4
- **Renewable Impact** — Visualize how green energy reduces your carbon footprint

---

## 🏗️ Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Vite, CSS-in-JS           |
| Backend    | Node.js, Express 4                  |
| AI Engine  | Anthropic Claude Sonnet (via SDK)   |
| Database   | MongoDB + Mongoose (optional)       |
| Auth       | Rate limiting via express-rate-limit|

---

## 📁 Project Structure

```
ai-energy-predictor/
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React application (all pages)
│   │   └── main.jsx         # React entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/
│   ├── server.js            # Express app + middleware setup
│   ├── controllers/
│   │   └── energyEngine.js  # Core energy prediction logic
│   ├── routes/
│   │   ├── predict.js       # POST /api/predict
│   │   ├── insight.js       # POST /api/insight  (Claude AI)
│   │   ├── history.js       # GET/DELETE /api/history
│   │   └── compare.js       # GET /api/compare
│   ├── models/
│   │   └── Prediction.js    # Mongoose schema
│   ├── .env.example
│   └── package.json
│
└── README.md
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js >= 18
- MongoDB (optional — app works without it)
- Anthropic API key → [console.anthropic.com](https://console.anthropic.com)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/ai-energy-predictor.git
cd ai-energy-predictor
```

### 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY and optionally MONGO_URI
npm run dev
```

### 3. Frontend setup
```bash
cd ../frontend
npm install
npm run dev
```

Open **http://localhost:5173** 🎉

---

## 🔌 API Endpoints

### `POST /api/predict`
Compute energy consumption for given model config.

**Body:**
```json
{
  "model_type": "llm",
  "model_size": "7B",
  "hardware": "A100",
  "batch_size": 32,
  "sequence_length": 512,
  "training_hours": 10,
  "inference_requests": 1000,
  "datacenter_pue": 1.2,
  "region": "India",
  "renewable_pct": 20
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_kwh": 14.76,
    "training_kwh": 12.5,
    "inference_kwh": 2.26,
    "co2_kg": 8.93,
    "cost_usd": 1.18,
    "water_liters": 26.57,
    "efficiency_score": 72.4,
    "equivalents": {
      "km_driven": "42",
      "phone_charges": "1230",
      "trees_to_offset": "0.4"
    }
  }
}
```

### `POST /api/insight`
Get Claude AI expert analysis for a prediction.

### `GET /api/history`
Retrieve prediction history (paginated).

### `GET /api/compare`
Get hardware comparison benchmarks.

### `GET /api/health`
Health check.

---

## 🧮 Energy Model

```
Training Energy (kWh) = (GPU_TDP / 1000) × hours × size_factor × type_factor × batch_factor × PUE

Inference Energy (kWh) = (GPU_TDP / 1000) × (requests / 10,000) × seq_factor × size_factor × type_factor × PUE

CO₂ (kg) = total_kWh × regional_carbon_intensity × (1 - renewable_fraction)

Cost ($) = total_kWh × $0.08

Water (L) = total_kWh × 1.8
```

Carbon intensity data from [IEA 2023](https://www.iea.org/data-and-statistics).

---

## 🌱 Contributing

PRs welcome! Areas for improvement:
- Add more hardware (e.g., AMD MI300X, Intel Gaudi)
- Add more regions with real-time carbon data
- Integrate real electricity pricing API
- Add multi-GPU cluster support
- Export predictions as PDF/CSV

---

## 📄 License

MIT © 2024 — Free to use, modify, and distribute.
