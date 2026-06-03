# TwinX Prompt Optimizer

Iterative learning tool for AI voice bot prompts. Upload a batch of call transcripts, run analysis, review flagged changes, and get an optimized prompt + changelog.

## How it works

1. **Setup** — Enter your Anthropic API key (stored in-session only, never persisted)
2. **Upload** — Drop your current voice bot prompt (.md or .txt) + call transcripts (.docx or .txt, up to 100 files)
3. **Run analysis** — Each transcript is analyzed individually against the goals in your prompt. Errors and suggestions are extracted per call.
4. **Human review** — Changes requiring domain knowledge or compliance judgment are flagged for your approval. High-confidence fixes are auto-applied.
5. **Output** — A new optimized prompt + changelog of every material change.

## Running locally

No build step. Just serve the single `index.html` file:

```bash
# Python 3
python3 -m http.server 8080
# then open http://localhost:8080

# Node (npx)
npx serve .
# then open http://localhost:3000

# VS Code: use the Live Server extension
```

## Deploying to Netlify

1. Push this repo to GitHub
2. Go to [netlify.com](https://netlify.com) → New site from Git
3. Select your repo — build command: *(leave blank)*, publish directory: `.`
4. Deploy

No environment variables needed — the API key is entered by the user in the browser at runtime.

## Transcript format

Supports the TwinX `seat:` / `customer:` format:

```
20260602

seat: Hello, is this [name]?
customer: Yes, who's this?
seat: This is Alina calling from Next Chapter...
```

Also accepts any plain text transcript. Multiple `.docx` or `.txt` files.

## Tech

- Pure HTML/CSS/JS — zero dependencies except mammoth.js (via CDN) for .docx parsing
- Calls Anthropic API directly from the browser
- No server, no backend, no build tooling

## Security note

Your API key is used only for direct calls to `api.anthropic.com`. It is not stored, logged, or sent anywhere else. Refreshing the page clears it.
