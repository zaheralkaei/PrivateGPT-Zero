/**
 * Local RAG (Retrieval-Augmented Generation) + Document Parsing Utilities
 *
 * Supports:
 * - Plain text (.txt, .md)
 * - PDF (.pdf) via pdf.js
 * - Word (.docx) via mammoth
 * - Images (vision models) via base64
 *
 * All parsing happens in the browser — no server involved.
 */

import type { DocumentChunk, UploadedFile } from '@/types';

/** Maximum document text size (in characters) that can be sent to the model as context.
 *  Browser LLMs have small context windows (~4K–8K tokens = ~16K–32K chars).
 *  Documents larger than this will be rejected with a user-facing message. */
export const MAX_DOCUMENT_CHARS = 30000;

/** Rough tokens estimate: ~4 chars per token for English text */
export const estimateTokens = (text: string) => Math.ceil(text.length / 4);

// =================== PDF Parsing ===================
// We load pdfjs dynamically so it's only bundled when actually needed

let pdfjsLib: any = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  const pdfjs = await import('pdfjs-dist');
  // Use the bundled worker module — no CDN fetch needed, works offline
  // Vite will handle the URL resolution at build time
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  pdfjsLib = pdfjs;
  return pdfjsLib;
}

export async function parsePdf(file: File): Promise<string> {
  try {
    const pdfjs = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      if (pageText.trim()) {
        pages.push(`--- Page ${i} ---\n${pageText}`);
      }
    }

    return pages.join('\n\n') || '[PDF: No extractable text found — this may be a scanned/image PDF]';
  } catch (err) {
    console.error('PDF parsing error:', err);
    return `[PDF parsing error: ${err instanceof Error ? err.message : 'Unknown error'}]`;
  }
}

// =================== Word/DOCX Parsing ===================
// mammoth is loaded dynamically

let mammothLib: any = null;

async function loadMammoth(): Promise<any> {
  if (mammothLib) return mammothLib;
  const mammoth = await import('mammoth');
  mammothLib = mammoth;
  return mammothLib;
}

export async function parseDocx(file: File): Promise<string> {
  try {
    const mammoth = await loadMammoth();
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || '[DOCX: No text content found]';
  } catch (err) {
    console.error('DOCX parsing error:', err);
    return `[DOCX parsing error: ${err instanceof Error ? err.message : 'Unknown error'}]`;
  }
}

// =================== Image Parsing (for vision models) ===================

export async function parseImageToBase64(file: File): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        dataUrl: reader.result as string,
        mimeType: file.type,
      });
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isVisionModel(modelId: string, availableModels: { id: string; vision?: boolean }[]): boolean {
  const model = availableModels.find((m) => m.id === modelId);
  return model?.vision === true;
}

// =================== General File Parsing ===================

// Safety cap for any single file read. The LLM context cap (MAX_DOCUMENT_CHARS) is
// checked separately, but reading a multi-GB file into a Blob/FileReader can OOM
// the tab before we ever get a chance to compare. 100 MB is generous.
const MAX_FILE_READ_BYTES = 100 * 1024 * 1024;

export async function parseFile(file: File): Promise<{ text: string; imageData?: { dataUrl: string; mimeType: string } }> {
  if (file.size > MAX_FILE_READ_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      text: `[File too large to process: ${file.name} (${sizeMb} MB). Max supported size is ${MAX_FILE_READ_BYTES / (1024 * 1024)} MB.]`,
    };
  }
  const name = file.name.toLowerCase();
  const type = file.type;

  // Image — for vision model input
  if (isImageFile(file)) {
    const { dataUrl, mimeType } = await parseImageToBase64(file);
    return {
      text: `[Image: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`,
      imageData: { dataUrl, mimeType },
    };
  }

  // PDF
  if (name.endsWith('.pdf') || type === 'application/pdf') {
    const text = await parsePdf(file);
    return { text };
  }

  // Word/DOCX
  if (name.endsWith('.docx') || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const text = await parseDocx(file);
    return { text };
  }

  // DOC (old Word format) — limited support
  if (name.endsWith('.doc') || type === 'application/msword') {
    return { text: '[Legacy .doc format — please convert to .docx for better text extraction, or paste the content directly.]' };
  }

  // CSV/TSV
  if (name.endsWith('.csv') || name.endsWith('.tsv')) {
    const text = await file.text();
    return { text: `--- CSV Data: ${file.name} ---\n${text}` };
  }

  // JSON
  if (name.endsWith('.json') || type === 'application/json') {
    const text = await file.text();
    return { text: `--- JSON Data: ${file.name} ---\n${text}` };
  }

  // HTML
  if (name.endsWith('.html') || name.endsWith('.htm') || type === 'text/html') {
    const text = await file.text();
    // Strip HTML tags for a basic text extraction
    const stripped = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return { text: `--- HTML: ${file.name} ---\n${stripped}` };
  }

  // Plain text, markdown, code files — just read as-is
  try {
    const text = await file.text();
    return { text: `--- ${file.name} ---\n${text}` };
  } catch {
    return { text: `[Could not read file: ${file.name}]` };
  }
}

// =================== RAG Utilities ===================

export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 100,
  source: string = 'document',
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  // Split on paragraph boundaries (double newline) to preserve structure
  const paragraphs = text.split(/\n{2,}/);
  let currentContent = '';

  for (const para of paragraphs) {
    // If a single paragraph exceeds chunkSize, split it by sentences
    if (para.length > chunkSize) {
      // Flush current content first
      if (currentContent.trim()) {
        chunks.push({
          id: crypto.randomUUID(),
          content: currentContent.trim(),
          source,
          metadata: { chunkIndex: String(chunks.length) },
        });
        currentContent = '';
      }
      // Split long paragraphs by sentence boundaries
      const sentences = para.split(/(?<=[.!?])\s+/);
      let sentenceChunk = '';
      for (const sentence of sentences) {
        if ((sentenceChunk + ' ' + sentence).length > chunkSize && sentenceChunk.trim()) {
          chunks.push({
            id: crypto.randomUUID(),
            content: sentenceChunk.trim(),
            source,
            metadata: { chunkIndex: String(chunks.length) },
          });
          // Keep last N chars as overlap for context continuity
          sentenceChunk = sentenceChunk.length > overlap ? sentenceChunk.slice(-overlap) + ' ' : '';
        }
        sentenceChunk = sentenceChunk ? sentenceChunk + ' ' + sentence : sentence;
      }
      if (sentenceChunk.trim()) {
        currentContent = sentenceChunk;
      }
    } else if ((currentContent + '\n\n' + para).length > chunkSize) {
      // Adding this paragraph would exceed the limit; flush current chunk
      if (currentContent.trim()) {
        chunks.push({
          id: crypto.randomUUID(),
          content: currentContent.trim(),
          source,
          metadata: { chunkIndex: String(chunks.length) },
        });
      }
      currentContent = para;
    } else {
      currentContent = currentContent ? currentContent + '\n\n' + para : para;
    }
  }

  if (currentContent.trim()) {
    chunks.push({
      id: crypto.randomUUID(),
      content: currentContent.trim(),
      source,
      metadata: { chunkIndex: String(chunks.length) },
    });
  }

  return chunks.length > 0 ? chunks : [{
    id: crypto.randomUUID(),
    content: text.trim(),
    source,
    metadata: { chunkIndex: '0' },
  }];
}

export function searchChunks(query: string, chunks: DocumentChunk[], topK: number = 5): DocumentChunk[] {
  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her',
    'was', 'one', 'our', 'out', 'has', 'have', 'this', 'that', 'with', 'from',
    'they', 'been', 'will', 'what', 'when', 'where', 'who', 'how', 'why', 'which',
  ]);
  const filteredTerms = queryTerms.filter((t) => !stopWords.has(t));

  const scored = chunks.map((chunk) => {
    const lower = chunk.content.toLowerCase();
    let score = 0;
    for (const term of filteredTerms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      const matches = lower.match(regex);
      if (matches) {
        score += matches.length;
        if (lower.includes(term)) score += 2;
      }
    }
    const wordCount = chunk.content.split(/\s+/).length;
    score = score / Math.sqrt(wordCount);
    return { chunk, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((s) => s.score > 0)
    .map((s) => s.chunk);
}

export function buildRAGPrompt(
  userQuery: string,
  contextChunks: DocumentChunk[],
  systemPrompt: string = '',
): string {
  if (contextChunks.length === 0) return userQuery;

  const contextBlock = contextChunks
    .map((c, i) => `[Source: ${c.source}, Part ${i + 1}]\n${c.content}`)
    .join('\n\n---\n\n');

  return `${systemPrompt ? systemPrompt + '\n\n' : ''}Based on the following context documents, answer the user's question. If the answer is not found in the context, say so honestly.\n\n--- CONTEXT ---\n${contextBlock}\n--- END CONTEXT ---\n\nUser question: ${userQuery}`;
}