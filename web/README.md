# TwinX Prompt Optimization Tool

A React web UI for the TwinX three-workflow Dify pipeline. Upload call transcripts and a voice bot system prompt, run the analysis pipeline, review AI-extracted improvement suggestions, and download a surgically edited optimized prompt — all without touching a terminal.

---

## Prerequisites

- Node 18+
- A running Dify instance with Workflows A, B, and C deployed (see `dify/` in the repo root)

---

## Setup

```bash
git clone https://github.com/JingChengGu/prompt-optimization-tool.git
cd prompt-optimization-tool/web
npm install
cp .env.example .env
# Edit .env with your Dify base URL and three API keys
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Getting Dify API Keys

1. Open your Dify instance and navigate to the workflow app (A, B, or C)
2. Click **API Access** in the left sidebar
3. Copy the API key shown — it starts with `app-`
4. Repeat for each of the three workflows and paste into `.env`

---

## Workflow Reference

| Workflow | Input keys | Output key | Description |
|---|---|---|---|
| **A** — Extract | `original_prompt`, `batch_transcripts` | `suggestions` | JSON array of prompt improvements per transcript batch |
| **B** — Cluster | `all_suggestions` | `clustered_suggestions` | Deduplicated formatted text grouped by category |
| **C** — Apply | `original_prompt`, `approved_suggestions` | `optimized_prompt` | Final edited prompt with approved changes applied |

All three workflows are called via `POST {VITE_DIFY_BASE_URL}/workflows/run` with `response_mode: blocking`.

---

## UI vs. optimize_prompt.py

Both the web UI and `optimize_prompt.py` (in the repo root) call the same three Dify APIs with identical inputs and outputs. The UI is for day-to-day use — drag-and-drop files, visual suggestion review, one-click download. The Python script is for server-side batch runs, CI pipelines, or debugging API responses directly.

---

## Deploy to Netlify

**Option 1 — Drag and drop:**
```bash
npm run build
# Drag the dist/ folder into app.netlify.com/drop
```

**Option 2 — Connect GitHub repo:**
1. Push this repo to GitHub
2. In Netlify: New site → Import from Git → select the repo
3. Set build command: `cd web && npm run build`
4. Set publish directory: `web/dist`
5. Add environment variables (`VITE_DIFY_BASE_URL`, `VITE_DIFY_WORKFLOW_A_KEY`, etc.) in **Site settings → Environment variables**
