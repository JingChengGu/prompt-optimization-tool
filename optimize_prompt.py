#!/usr/bin/env python3
"""
TwinX Prompt Optimization Orchestrator

Reads call transcripts, batches them, extracts improvement suggestions via Dify
Workflow A, deduplicates/clusters via Workflow B, presents for human review,
then assembles the final optimized prompt via Workflow C.

Usage:
    python optimize_prompt.py

Folder layout:
    inputs/          — place your voice bot prompt here (any .md or .txt name)
    transcripts/     — place .docx or .txt call transcripts here
    outputs/         — suggestions_for_review.txt and optimized prompt written here

Required environment variables (or edit the config block below):
    DIFY_BASE_URL                — e.g. https://api.dify.ai/v1
    DIFY_WORKFLOW_A_KEY          — Workflow A API key (suggestion extraction)
    DIFY_WORKFLOW_B_KEY          — Workflow B API key (dedup + clustering)
    DIFY_WORKFLOW_C_KEY          — Workflow C API key (final prompt assembly)
"""

import json
import os
import re
import sys
from pathlib import Path

import requests

# ── Configuration ─────────────────────────────────────────────────────────────
DIFY_BASE_URL    = os.environ.get("DIFY_BASE_URL",         "https://api.dify.ai/v1")
WORKFLOW_A_KEY   = os.environ.get("DIFY_WORKFLOW_A_KEY",   "")
WORKFLOW_B_KEY   = os.environ.get("DIFY_WORKFLOW_B_KEY",   "")
WORKFLOW_C_KEY   = os.environ.get("DIFY_WORKFLOW_C_KEY",   "")

BATCH_CHAR_LIMIT = 8_000   # max chars per batch sent to Workflow A

# ── Paths ─────────────────────────────────────────────────────────────────────
DIR             = Path(__file__).parent
INPUTS_DIR      = DIR / "inputs"
TRANSCRIPTS_DIR = DIR / "transcripts"
OUTPUTS_DIR     = DIR / "outputs"


# ── Transcript loading ────────────────────────────────────────────────────────

def parse_merged_transcripts(path: Path) -> list[dict]:
    """Parse the merged .txt produced by transcript-merger.html."""
    text = path.read_text(encoding="utf-8")
    transcripts: list[dict] = []
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("===TRANSCRIPT_START:") and line.endswith("==="):
            filename = line[len("===TRANSCRIPT_START:"):-3].strip()
            body_lines: list[str] = []
            i += 1
            while i < len(lines) and not lines[i].startswith("===TRANSCRIPT_END"):
                body_lines.append(lines[i])
                i += 1
            transcripts.append({"filename": filename, "content": "\n".join(body_lines).strip()})
        i += 1
    return transcripts


def load_docx_transcripts(folder: Path) -> list[dict]:
    try:
        import docx
    except ImportError:
        sys.exit("python-docx is not installed. Run: pip install python-docx")
    transcripts: list[dict] = []
    for path in sorted(folder.glob("*.docx")):
        doc = docx.Document(path)
        content = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        transcripts.append({"filename": path.name, "content": content})
    return transcripts


def load_txt_transcripts(folder: Path) -> list[dict]:
    return [
        {"filename": p.name, "content": p.read_text(encoding="utf-8").strip()}
        for p in sorted(folder.glob("*.txt"))
    ]


# ── Batching ──────────────────────────────────────────────────────────────────

def batch_transcripts(transcripts: list[dict], char_limit: int) -> list[list[dict]]:
    """Pack transcripts into batches without exceeding char_limit per batch."""
    batches: list[list[dict]] = []
    current: list[dict] = []
    current_chars = 0
    for t in transcripts:
        tlen = len(t["content"])
        if current and current_chars + tlen > char_limit:
            batches.append(current)
            current = [t]
            current_chars = tlen
        else:
            current.append(t)
            current_chars += tlen
    if current:
        batches.append(current)
    return batches


def format_batch(batch: list[dict]) -> str:
    parts = [
        f"===TRANSCRIPT_START:{t['filename']}===\n{t['content']}\n===TRANSCRIPT_END==="
        for t in batch
    ]
    return "\n\n".join(parts)


# ── Dify API ──────────────────────────────────────────────────────────────────

def call_dify(api_key: str, inputs: dict, label: str) -> dict:
    """Call a Dify workflow in blocking mode; return its outputs dict."""
    if not api_key:
        sys.exit(
            f"\nError: API key for {label} is not set.\n"
            "Set DIFY_WORKFLOW_A_KEY / _B_KEY / _C_KEY environment variables,\n"
            "or edit the config block at the top of this script."
        )
    url = f"{DIFY_BASE_URL}/workflows/run"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload  = {"inputs": inputs, "response_mode": "blocking", "user": "prompt-optimizer"}
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=180)
        resp.raise_for_status()
    except requests.exceptions.Timeout:
        sys.exit(f"\nError: {label} timed out after 180 s.")
    except requests.exceptions.HTTPError:
        sys.exit(f"\nError calling {label}: HTTP {resp.status_code}\n{resp.text}")
    data = resp.json()
    outputs = data.get("data", {}).get("outputs", {})
    if not outputs:
        print(f"  Warning: {label} returned empty outputs. Full response:\n{json.dumps(data, indent=2)}")
    return outputs


# ── Main ──────────────────────────────────────────────────────────────────────

def find_prompt_file() -> Path:
    """Find any .md or .txt file in inputs/ — error if zero or more than one."""
    if not INPUTS_DIR.exists():
        sys.exit(
            f"Error: inputs/ folder not found.\n"
            f"Create it at {INPUTS_DIR} and place your prompt file inside."
        )
    candidates = list(INPUTS_DIR.glob("*.md")) + list(INPUTS_DIR.glob("*.txt"))
    if not candidates:
        sys.exit(f"Error: no .md or .txt file found in {INPUTS_DIR}/")
    if len(candidates) > 1:
        names = ", ".join(p.name for p in candidates)
        sys.exit(f"Error: multiple prompt files found in inputs/ ({names}). Keep only one.")
    return candidates[0]


def main() -> None:
    print("=== TwinX Prompt Optimization Pipeline ===\n")

    OUTPUTS_DIR.mkdir(exist_ok=True)
    suggestions_review_file = OUTPUTS_DIR / "suggestions_for_review.txt"
    optimized_prompt_file   = OUTPUTS_DIR / "optimized_prompt.md"

    # 1. Load original prompt (reference only — never written back)
    prompt_file = find_prompt_file()
    original_prompt = prompt_file.read_text(encoding="utf-8").strip()
    print(f"Prompt loaded: inputs/{prompt_file.name}  ({len(original_prompt):,} chars)\n")

    # Resume shortcut: if suggestions file already exists, skip A+B
    if suggestions_review_file.exists() and suggestions_review_file.stat().st_size > 0:
        print(f"Found existing suggestions file: outputs/suggestions_for_review.txt")
        answer = input("  Skip Workflows A+B and go straight to review? [Y/n]: ").strip().lower()
        if answer in ("", "y", "yes"):
            print()
            approved = _human_review(suggestions_review_file)
            _run_workflow_c(original_prompt, approved, optimized_prompt_file)
            return

    # 2. Load transcripts
    transcripts: list[dict] = []
    if TRANSCRIPTS_DIR.exists():
        print(f"Reading transcripts folder: transcripts/")
        transcripts = load_docx_transcripts(TRANSCRIPTS_DIR) + load_txt_transcripts(TRANSCRIPTS_DIR)
    else:
        sys.exit(
            f"No transcripts/ folder found.\n"
            f"Create {TRANSCRIPTS_DIR}/ and place .docx or .txt transcript files inside."
        )

    if not transcripts:
        sys.exit("transcripts/ folder is empty — add .docx or .txt files and try again.")

    print(f"  {len(transcripts)} transcript(s) loaded\n")

    # 3. Batch
    batches = batch_transcripts(transcripts, BATCH_CHAR_LIMIT)
    print(f"Batched into {len(batches)} batch(es)  (ceiling: {BATCH_CHAR_LIMIT:,} chars/batch)\n")

    # 4. Workflow A — per-batch suggestion extraction
    print("── Workflow A: suggestion extraction ──")
    all_suggestions: list = []

    for i, batch in enumerate(batches, 1):
        names = [t["filename"] for t in batch]
        label_names = ", ".join(names[:3]) + ("…" if len(names) > 3 else "")
        print(f"  Batch {i}/{len(batches)}  ({len(batch)} transcripts: {label_names})")

        outputs = call_dify(
            WORKFLOW_A_KEY,
            inputs={
                "original_prompt":  original_prompt,
                "batch_transcripts": format_batch(batch),
            },
            label=f"Workflow A – batch {i}",
        )

        raw = outputs.get("suggestions", "[]")
        if isinstance(raw, str):
            raw = re.sub(r'^```(?:json)?\s*', '', raw.strip())
            raw = re.sub(r'\s*```$', '', raw)
        try:
            batch_suggestions = json.loads(raw) if isinstance(raw, str) else raw
            if not isinstance(batch_suggestions, list):
                batch_suggestions = [batch_suggestions]
        except json.JSONDecodeError:
            batch_suggestions = [{"text": raw, "category": "other", "batch": i}]

        print(f"    → {len(batch_suggestions)} suggestion(s) extracted")
        all_suggestions.extend(batch_suggestions)

    print(f"\nTotal suggestions collected: {len(all_suggestions)}\n")

    # 5. Workflow B — dedup + clustering
    print("── Workflow B: dedup + clustering ──")
    b_outputs = call_dify(
        WORKFLOW_B_KEY,
        inputs={"all_suggestions": json.dumps(all_suggestions, ensure_ascii=False)},
        label="Workflow B",
    )
    clustered = b_outputs.get("clustered_suggestions", "")
    if not clustered:
        print("  Warning: Workflow B returned empty output — falling back to raw suggestions.")
        clustered = json.dumps(all_suggestions, indent=2, ensure_ascii=False)
    print(f"  → Clustered output: {len(clustered):,} chars\n")

    # 6. Human gate
    suggestions_review_file.write_text(clustered, encoding="utf-8")
    approved = _human_review(suggestions_review_file)
    _run_workflow_c(original_prompt, approved, optimized_prompt_file)


def _human_review(suggestions_review_file: Path) -> str:
    print("─" * 60)
    print("  HUMAN REVIEW")
    print("─" * 60)
    print(f"  File: outputs/suggestions_for_review.txt")
    print()
    print("  Read each suggestion.")
    print("  Delete any lines or blocks you want to EXCLUDE.")
    print("  Save the file, then return here.")
    print()
    input("  Press ENTER when you have finished editing... ")
    print()
    approved = suggestions_review_file.read_text(encoding="utf-8").strip()
    if not approved:
        sys.exit("No suggestions remain after review. Exiting without changes.")
    print(f"Approved suggestions: {len(approved):,} chars\n")
    return approved


def _run_workflow_c(original_prompt: str, approved: str, optimized_prompt_file: Path) -> None:
    print("── Workflow C: final prompt assembly ──")
    c_outputs = call_dify(
        WORKFLOW_C_KEY,
        inputs={
            "original_prompt":      original_prompt,
            "approved_suggestions": approved,
        },
        label="Workflow C",
    )
    optimized = c_outputs.get("optimized_prompt", "")
    if not optimized:
        sys.exit("Error: Workflow C returned an empty optimized prompt.")
    optimized_prompt_file.write_text(optimized, encoding="utf-8")
    print()
    print("─" * 60)
    print("  DONE")
    print("─" * 60)
    print(f"  Output: outputs/{optimized_prompt_file.name}")
    print(f"  Original: {len(original_prompt):,} chars → Optimized: {len(optimized):,} chars")


if __name__ == "__main__":
    main()
