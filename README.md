# PrivateGPT Zero

**Fully client-side AI chat — no server, no login, no data leaves your browser.**

PrivateGPT Zero runs large language models (LLMs) directly in your browser using [WebLLM](https://github.com/mlc-ai/web-llm) and WebGPU. Models are downloaded once from MLC's CDN and cached locally. After that, everything runs offline — your conversations never leave your device.

## Features

- **Privacy-first** — No data sent to any server (except initial model download from CDN)
- **No account required** — Open the app and start chatting
- **12 models** — From 1.5B to 9B params, including Qwen, Phi, Hermes, and a vision model
- **Document context** — Upload PDFs, DOCX, text files, code, or images to give the model context (see [How document context works](#how-document-context-works) below)
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
npm run preview
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

## How document context works

Drop a file on the chat input (PDF, DOCX, TXT, MD, JSON, CSV, HTML, or code) and the model will use it as context for your next messages. Everything happens locally — files are parsed in your browser, never uploaded.

**What the app does on upload:**

1. **Parses the file** in the browser:
   - PDF → [pdf.js](https://mozilla.github.io/pdf.js/) extracts text page by page
   - DOCX → [mammoth](https://github.com/mwilliamson/mammoth.js) extracts raw text
   - Images → read as base64 (sent to the model only if you have a vision model loaded)
   - Everything else (txt, md, code, json, csv, html) → read as-is, with HTML tags stripped
2. **Stores the extracted text** in the conversation record (IndexedDB), so the document stays attached to that chat across page reloads and offline sessions.
3. **On every subsequent message**, the full extracted text is included in the system prompt, wrapped in `--- BEGIN DOCUMENT: name --- ... --- END DOCUMENT: name ---` markers, telling the model to use it as context.

**Important limitations** (browser LLMs have small context windows, typically 4K–8K tokens):

- Total document content per conversation is capped at **30,000 characters** (~7,500 tokens). Documents larger than that are rejected with a clear error message and suggestions.
- The full document is sent to the model on every turn — there is no vector search, embedding model, or chunk-level retrieval. For small-to-medium documents this is fast and works well; for very long documents you'd want a server-side RAG pipeline.
- Every uploaded document in the conversation is included every turn, so uploading many large documents can fill the context window quickly. The header shows a live `Context: N / M tokens` bar so you can see usage.
- A built-in safety cap (100 MB) prevents a huge file from being read into memory before the content-size check can run.

Vision-model images are passed through differently: the base64 image goes directly into the user message as an `image_url` content part, so the model sees the actual image rather than a text description of it.

If you need true RAG (semantic search over large document corpora), you'd need to swap the document-handling layer in `src/components/chat/ChatInterface.tsx` for a chunking-and-embedding pipeline — the helper functions in `src/lib/rag.ts` (`chunkText`, `searchChunks`, `buildRAGPrompt`) are written and exported for that purpose but are not currently wired into the chat flow.

## Tech Stack

- **React 19** + **TypeScript** — UI framework
- **Zustand** — state management
- **Vite** — build tool
- **Tailwind CSS** — styling
- **Framer Motion** — animations
- **@mlc-ai/web-llm** — in-browser LLM inference
- **pdfjs-dist** + **mammoth** — document parsing (PDF, DOCX)
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