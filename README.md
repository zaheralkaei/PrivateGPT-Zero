# PrivateGPT Zero

**Fully client-side AI chat — no server, no login, no data leaves your browser.**

PrivateGPT Zero runs large language models (LLMs) directly in your browser using [WebLLM](https://github.com/mlc-ai/web-llm) and WebGPU. Models are downloaded once from MLC's CDN and cached locally. After that, everything runs offline — your conversations never leave your device.

## Features

- **Privacy-first** — No data sent to any server (except initial model download from CDN)
- **No account required** — Open the app and start chatting
- **12 models** — From 1.5B to 9B params, including Qwen, Phi, Hermes, and a vision model
- **RAG support** — Upload PDFs, text files, or images for context-aware answers
- **Offline capable** — Service worker caches assets; works offline after first visit
- **Streaming output** — See responses as they're generated in real time
- **Customizable** — System prompt templates, temperature, top-p, max tokens
- **Dark/Light theme** — Follows system preference or manual toggle
- **Conversation management** — Create, rename, export (JSON/Markdown/TXT), and import chats

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npx serve dist -s -p 3000
```

### Prerequisites

- **Node.js** 18+ (for build tooling)
- **WebGPU-enabled browser** (Chrome 113+, Edge 113+) — models use WebGPU for inference
- **~2–8 GB RAM** free (depending on model size)

### Memory Requirements

| Model Size | Estimated RAM |
|-----------|--------------|
| 1.5–1.7B  | ~2 GB        |
| 3–4B      | ~4 GB        |
| 8–9B      | ~8 GB        |

## Available Models

| Category | Models |
|----------|--------|
| Small    | Qwen 2.5 1.5B, Qwen3 1.7B |
| Medium   | Qwen 2.5 3B, Qwen 2.5 Coder 3B, Qwen3 4B, Phi-4 Mini |
| Large    | Qwen3 8B, Qwen3.5 9B |
| Less-censored | Hermes 3 Llama 3.2 3B, Hermes 3 Llama 3.1 8B, OpenHermes 2.5 |
| Vision   | Phi 3.5 Vision (image + text input) |

## Architecture

```
Browser
├── WebLLM (MLC AI) → WebGPU model inference
├── IndexedDB (idb-keyval) → conversation persistence
├── Cache API → model weights (downloaded once, cached)
├── Service Worker → offline asset caching
└── React 19 + Zustand → UI + state management
```

## Tech Stack

- **React 19** + **TypeScript** — UI framework
- **Zustand** — state management
- **Vite** — build tool
- **Tailwind CSS** — styling
- **Framer Motion** — animations
- **@mlc-ai/web-llm** — in-browser LLM inference
- **pdfjs-dist** — PDF parsing for RAG
- **react-markdown** + **remark-gfm** — markdown rendering

## Offline Usage

1. Visit the app once (models download from CDN on first load)
2. Once a model is cached, close the tab
3. Reopen the app — the service worker serves cached assets
4. Load your cached model and chat offline

> Note: Opening a new tab while offline works because the service worker intercepts navigation requests.

## Development

```bash
npm run dev     # Dev server with HMR
npm run build   # Production build
npm run preview # Preview production build
```

## Conceptualized by [Zaher Alkaei](https://github.com/zaheralkaei)

## License

MIT