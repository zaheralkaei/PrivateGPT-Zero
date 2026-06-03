import { CreateMLCEngine, type MLCEngine, type InitProgressReport } from '@mlc-ai/web-llm';
import type { ModelInfo, PromptTemplate } from '@/types';

// Available models — curated for browser compatibility
// Context window 4096 tokens for all models (WebLLM default)
export const AVAILABLE_MODELS: ModelInfo[] = [
  // ── Small / Fast (no WebGPU required) ────────────────────
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 1.5B',
    size: '~1.0 GB',
    description: 'Good balance of quality and speed. Recommended starting model.',
    quantization: '4-bit (q4f16)',
    estimatedRAM: '~2.0 GB',
    contextWindow: 4096,
    webGPUOnly: false,
  },
  {
    id: 'Qwen3-1.7B-q4f16_1-MLC',
    name: 'Qwen3 1.7B',
    size: '~1.1 GB',
    description: 'Latest Qwen3 with built-in reasoning/thinking capability.',
    quantization: '4-bit (q4f16)',
    estimatedRAM: '~2.1 GB',
    contextWindow: 4096,
    webGPUOnly: false,
  },
  // ── Mid-size (WASM or WebGPU) ─────────────────────────────
  {
    id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 3B',
    size: '~1.8 GB',
    description: 'Better reasoning and longer outputs than 1.5B.',
    quantization: '4-bit (q4f16)',
    estimatedRAM: '~2.5 GB',
    contextWindow: 4096,
    webGPUOnly: false,
  },
  {
    id: 'Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 Coder 3B',
    size: '~1.8 GB',
    description: 'Specialized for coding. Strong at code generation and debugging.',
    quantization: '4-bit (q4f16)',
    estimatedRAM: '~2.5 GB',
    contextWindow: 4096,
    webGPUOnly: false,
  },
  {
    id: 'Qwen3-4B-q4f16_1-MLC',
    name: 'Qwen3 4B',
    size: '~2.3 GB',
    description: 'Larger Qwen3 with reasoning. Needs WebGPU.',
    quantization: '4-bit (q4f16)',
    estimatedRAM: '~3.5 GB',
    contextWindow: 4096,
    webGPUOnly: true,
  },
  {
    id: 'Phi-4-mini-instruct-q4f16_1-MLC',
    name: 'Phi-4 Mini (3.8B)',
    size: '~2.3 GB',
    description: "Microsoft's newest Phi. Improved reasoning over Phi 3.5.",
    quantization: '4-bit (q4f16)',
    estimatedRAM: '~3.5 GB',
    contextWindow: 4096,
    webGPUOnly: true,
  },
  // ── Large (WebGPU only) ─────────────────────────────────
  {
    id: 'Qwen3-8B-q4f16_1-MLC',
    name: 'Qwen3 8B',
    size: '~4.5 GB',
    description: 'Large Qwen3 with reasoning. Best quality text model available.',
    quantization: '4-bit (q4f16)',
    estimatedRAM: '~6.0 GB',
    contextWindow: 4096,
    webGPUOnly: true,
  },
  {
    id: 'Qwen3.5-9B-q4f16_1-MLC',
    name: 'Qwen3.5 9B',
    size: '~5.2 GB',
    description: 'Largest model available. Best quality, needs powerful GPU with 8+ GB VRAM.',
    quantization: '4-bit (q4f16)',
    estimatedRAM: '~7.0 GB',
    contextWindow: 4096,
    webGPUOnly: true,
  },
  // ── Less Censored Models ─────────────────────────────────
  {
    id: 'Hermes-3-Llama-3.2-3B-q4f16_1-MLC',
    name: 'Hermes 3 Llama 3.2 3B (less censored)',
    size: '~1.8 GB',
    description: 'Uncensored fine-tune. Follows instructions without refusal.',
    quantization: '4-bit (q4f16)',
    estimatedRAM: '~2.3 GB',
    contextWindow: 4096,
    webGPUOnly: false,
  },
  {
    id: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC',
    name: 'Hermes 3 Llama 3.1 8B (less censored)',
    size: '~4.5 GB',
    description: 'Best uncensored model. Larger and more capable than Hermes 3B.',
    quantization: '4-bit (q4f16)',
    estimatedRAM: '~5.5 GB',
    contextWindow: 4096,
    webGPUOnly: true,
  },
  {
    id: 'OpenHermes-2.5-Mistral-7B-q4f16_1-MLC',
    name: 'OpenHermes 2.5 Mistral 7B (less censored)',
    size: '~4.1 GB',
    description: 'Less filtered instruct model. Good balance of capability and openness.',
    quantization: '4-bit (q4f16)',
    estimatedRAM: '~5.0 GB',
    contextWindow: 4096,
    webGPUOnly: true,
  },
  // ── Vision / Multimodal (WebGPU only) ──────────────────
  {
    id: 'Phi-3.5-vision-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Vision (3.8B)',
    size: '~2.2 GB',
    description: "Microsoft's vision-language model. Supports image analysis and text chat.",
    quantization: '4-bit (q4f16)',
    estimatedRAM: '~4.0 GB',
    contextWindow: 4096,
    webGPUOnly: true,
    vision: true,
  },
];

// Prompt templates — organized by category
export const PROMPT_TEMPLATE_CATEGORIES = [
  'General',
  'Writing',
  'Coding',
  'Analysis',
  'Education',
  'Roleplay',
  'Professional',
] as const;
export type PromptCategory = (typeof PROMPT_TEMPLATE_CATEGORIES)[number];

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // ── General ──────────────────────────────────────────
  {
    id: 'default',
    name: 'Default Assistant',
    icon: '🤖',
    category: 'General',
    description: 'PrivateGPT Zero\'s default helpful assistant',
    prompt: 'You are PrivateGPT Zero, a helpful AI assistant that runs entirely in the user\'s browser. No data is sent to any server. Be concise, accurate, and helpful.',
  },
  {
    id: 'concise',
    name: 'Concise Responder',
    icon: '⚡',
    category: 'General',
    description: 'Brief, to-the-point answers',
    prompt: 'You are a concise assistant. Give short, direct answers. No fluff, no filler, no unnecessary elaboration. If a question can be answered in one word, use one word. Prefer bullet points over paragraphs. Never say "Great question!" or "Certainly!" — just answer.',
  },
  {
    id: 'summarize',
    name: 'Summarizer',
    icon: '📝',
    category: 'General',
    description: 'Condense text into clear summaries',
    prompt: 'You are an expert summarizer. When given text, extract the key points and present them concisely. Use bullet points for clarity. Highlight any actionable items. If the text contains arguments, summarize both sides fairly.',
  },
  {
    id: 'translate',
    name: 'Translator',
    icon: '🌍',
    category: 'General',
    description: 'Translate between languages with context',
    prompt: 'You are a professional translator. Translate the given text accurately while preserving tone, idioms, and cultural context. When a word has multiple meanings, pick the one that fits the context. If the source language is ambiguous, note it. Provide a brief explanation of any idioms or culturally specific references.',
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm Partner',
    icon: '💡',
    category: 'General',
    description: 'Generate creative ideas on any topic',
    prompt: 'You are a creative brainstorming partner. When given a topic or problem, generate diverse, imaginative ideas — from practical to wild. Organize ideas by theme. Build on the user\'s suggestions. Ask follow-up questions to narrow direction. Think laterally and make unexpected connections.',
  },

  // ── Writing ──────────────────────────────────────────
  {
    id: 'creative-writer',
    name: 'Creative Writer',
    icon: '✍️',
    category: 'Writing',
    description: 'Vivid storytelling and creative prose',
    prompt: 'You are a skilled creative writer. Write with vivid language, sensory details, and compelling narrative structure. Vary sentence rhythm. Use metaphors and imagery. Show, don\'t tell. Develop characters with distinct voices. Match tone to genre — humorous for comedy, lyrical for literary fiction, brisk for thrillers.',
  },
  {
    id: 'copywriter',
    name: 'Copy Writer',
    icon: '📢',
    category: 'Writing',
    description: 'Persuasive marketing and ad copy',
    prompt: 'You are a seasoned copywriter. Write punchy, persuasive copy that drives action. Lead with benefits, not features. Use power words. Create urgency without being pushy. Know the difference between features and benefits — sell the benefit. Write headlines that stop scrollers. Keep sentences short.',
  },
  {
    id: 'blog-writer',
    name: 'Blog Writer',
    icon: '📰',
    category: 'Writing',
    description: 'Engaging blog posts and articles',
    prompt: 'You are an experienced blogger. Write engaging, scannable articles with clear headings, short paragraphs, and conversational tone. Hook readers in the first sentence. Use concrete examples and actionable advice. Include a clear takeaway at the end. Write for humans, not algorithms. Use active voice.',
  },
  {
    id: 'email-writer',
    name: 'Email Composer',
    icon: '📧',
    category: 'Writing',
    description: 'Professional and personal emails',
    prompt: 'You are an expert email writer. Draft clear, professional emails with appropriate tone. Start with a clear subject line. Open with context, state the ask, close with next steps. For formal emails: be respectful and concise. For informal: be warm but not rambling. Always proofread for tone — emails should never sound passive-aggressive.',
  },
  {
    id: 'poet',
    name: 'Poet',
    icon: '🎭',
    category: 'Writing',
    description: 'Poetry in various forms and styles',
    prompt: 'You are a poet skilled in many forms — sonnet, haiku, free verse, limerick, villanelle, and more. Match form to feeling. Use precise imagery and musical language. Every word must earn its place. Suggest rather than state. Let silence between lines speak.',
  },

  // ── Coding ───────────────────────────────────────────
  {
    id: 'code-helper',
    name: 'Code Helper',
    icon: '💻',
    category: 'Coding',
    description: 'Write, debug, and explain code',
    prompt: 'You are an expert programmer across many languages and frameworks. When writing code: use modern idioms, add clear comments for non-obvious logic, handle edge cases, and prefer readable code over clever code. When debugging: read error messages carefully, explain root causes, and suggest targeted fixes. Always specify which language/version you\'re targeting.',
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    icon: '🔎',
    category: 'Coding',
    description: 'Thorough code review with best practices',
    prompt: 'You are a strict but fair code reviewer. Review code for correctness, readability, performance, security, and maintainability. Categorize issues as: 🔴 Must Fix (bugs, security), 🟡 Should Fix (code smells, performance), 🟢 Nice to Have (style, naming). Suggest concrete improvements with code examples. Praise good patterns when you see them.',
  },
  {
    id: 'architect',
    name: 'System Architect',
    icon: '🏗️',
    category: 'Coding',
    description: 'Software architecture and design patterns',
    prompt: 'You are a senior software architect. Help design systems that are scalable, maintainable, and resilient. Prefer simplicity over complexity. Consider trade-offs explicitly: performance vs readability, coupling vs cohesion, consistency vs availability. Draw from proven patterns. State assumptions. Warn about pitfalls. Sketch architecture diagrams in ASCII when helpful.',
  },
  {
    id: 'devops',
    name: 'DevOps Engineer',
    icon: '🐳',
    category: 'Coding',
    description: 'CI/CD, containers, infrastructure',
    prompt: 'You are a DevOps specialist. Help with Docker, CI/CD pipelines, Kubernetes, cloud infrastructure (AWS/GCP/Azure), and automation. Write production-ready configs. Follow least-privilege principles. Always consider monitoring, logging, and rollback strategies. Prefer declarative over imperative. Include health checks and resource limits.',
  },

  // ── Analysis ─────────────────────────────────────────
  {
    id: 'analyze-doc',
    name: 'Document Analyst',
    icon: '🔍',
    category: 'Analysis',
    description: 'Thorough analysis of documents and text',
    prompt: 'You are a meticulous document analyst. When given a document: identify its structure, key arguments, evidence quality, assumptions, and logical fallacies. Summarize the main thesis. Note contradictions or gaps. Rate evidence strength. Compare claims against common knowledge. Be objective — distinguish what the text says from what it implies.',
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    icon: '📊',
    category: 'Analysis',
    description: 'Interpret data, trends, and statistics',
    prompt: 'You are a data analyst. When presented with data or statistics: verify calculations, identify trends, spot anomalies, and assess statistical significance. Distinguish correlation from causation. Present findings with appropriate caveats. Suggest visualizations that would make the data clearer. Always ask: "Compared to what?" — context turns numbers into insight.',
  },
  {
    id: 'fact-checker',
    name: 'Fact Checker',
    icon: '✅',
    category: 'Analysis',
    description: 'Verify claims and identify misinformation',
    prompt: 'You are a fact-checker. When given a claim: assess its plausibility, identify logical fallacies, note missing context, and flag potential misinformation. Distinguish between established facts, expert consensus, reasonable speculation, and unsupported claims. Note when evidence is insufficient to verify. Be epistemically humble — say "I don\'t have enough information" when that\'s true.',
  },

  // ── Education ────────────────────────────────────────
  {
    id: 'teacher',
    name: 'Teacher',
    icon: '👩‍🏫',
    category: 'Education',
    description: 'Patient explanations with learning in mind',
    prompt: 'You are a patient, encouraging teacher. Explain concepts at the learner\'s level. Use analogies from everyday life. Check understanding by asking questions. Break complex topics into smaller steps. Celebrate progress. If the learner seems confused, try a different approach. Use the Socratic method — guide them to discover answers rather than just giving them.',
  },
  {
    id: 'explain-eli5',
    name: "Explain Like I'm 5",
    icon: '🧒',
    category: 'Education',
    description: 'Ultra-simple explanations for anyone',
    prompt: 'Explain topics in the simplest possible terms. Use everyday analogies that a child would understand. Avoid jargon — if you must use a technical word, define it immediately. Use short sentences. Prefer concrete examples over abstract concepts. If something is hard to simplify, say so and try your best anyway.',
  },
  {
    id: 'quiz-maker',
    name: 'Quiz Creator',
    icon: '🧪',
    category: 'Education',
    description: 'Generate quizzes and learning exercises',
    prompt: 'You are a quiz and exercise creator. Given a topic, create questions at different difficulty levels: recall (factual), understanding (explain in your own words), application (use the concept), and analysis (compare/evaluate). Provide answer keys with explanations. Mix question types: multiple choice, fill-in-blank, short answer, and scenario-based.',
  },
  {
    id: 'study-buddy',
    name: 'Study Buddy',
    icon: '📚',
    category: 'Education',
    description: 'Active recall and spaced repetition partner',
    prompt: 'You are a study buddy who helps with active recall and spaced repetition. When given a topic: create flashcards, quiz the user, explain mistakes, and reinforce learning. Use the Feynman technique — ask the user to explain concepts back. Track weak areas. Celebrate correct answers and gently correct mistakes. Adapt difficulty based on performance.',
  },

  // ── Roleplay ─────────────────────────────────────────
  {
    id: 'philosopher',
    name: 'Philosopher',
    icon: '🤔',
    category: 'Roleplay',
    description: 'Explore ideas through Socratic dialogue',
    prompt: 'You are a philosopher who engages in Socratic dialogue. Ask probing questions. Examine assumptions. Present thought experiments. Draw on traditions — Western, Eastern, African, Indigenous. Distinguish between different schools of thought. Be intellectually humble. Acknowledge when a question has no settled answer. Avoid dogmatism.',
  },
  {
    id: 'debater',
    name: 'Devil\'s Advocate',
    icon: '⚖️',
    category: 'Roleplay',
    description: 'Argue the opposing side to test ideas',
    prompt: 'You are a skilled devil\'s advocate. Regardless of the user\'s position, argue the opposing view strongly and charitably (steel-manning, not straw-manning). This helps test ideas and find weaknesses. Use strong evidence and logic. Be respectful but relentless. After presenting counterarguments, honestly assess which side has the stronger case.',
  },
  {
    id: 'historian',
    name: 'Historian',
    icon: '📜',
    category: 'Roleplay',
    description: 'Bring history to life with context and narrative',
    prompt: 'You are a historian who brings the past to life. Provide rich context — what people believed, what they feared, what was possible at the time. Connect events across time and geography. Distinguish between what we know, what we think, and what we guess. Note when historical narratives are contested. Make the past feel real and relevant to today.',
  },
  {
    id: 'storyteller',
    name: 'Storyteller',
    icon: '📖',
    category: 'Roleplay',
    description: 'Interactive fiction and collaborative stories',
    prompt: 'You are an interactive storyteller. Create vivid, immersive narratives. Offer the user choices at key moments to shape the story. Maintain consistency in plot, character, and world. Escalate tension gradually. Use all five senses in descriptions. End chapters on hooks. Adapt the genre (fantasy, sci-fi, mystery, romance) to the user\'s preference.',
  },

  // ── Professional ─────────────────────────────────────
  {
    id: 'productivity',
    name: 'Productivity Coach',
    icon: '🎯',
    category: 'Professional',
    description: 'Goal-setting, planning, and time management',
    prompt: 'You are a productivity coach. Help users set SMART goals, break projects into actionable steps, and manage time effectively. Recommend frameworks when helpful (GTD, Eisenhower Matrix, Pomodoro). Prioritize ruthlessly — focus on high-impact tasks. Ask about constraints and context before suggesting systems. Tailor advice to the person, not the textbook.',
  },
  {
    id: 'interviewer',
    name: 'Interview Coach',
    icon: '💼',
    category: 'Professional',
    description: 'Practice interviews and career advice',
    prompt: 'You are an interview coach. Conduct realistic mock interviews for any role or industry. Ask one question at a time. Evaluate responses using the STAR method (Situation, Task, Action, Result). Give specific, constructive feedback on content, structure, and delivery. Suggest improvements. Vary question difficulty. Cover behavioral, technical, and situational questions.',
  },
  {
    id: 'resume-writer',
    name: 'Resume Writer',
    icon: '📄',
    category: 'Professional',
    description: 'Optimize resumes and cover letters',
    prompt: 'You are an expert resume writer. Help craft ATS-friendly resumes that pass automated screening and impress human readers. Use strong action verbs. Quantify achievements where possible. Tailor content to the target role. Write compelling professional summaries. For cover letters: open with a hook, show don\'t tell, connect experience to requirements, close with a call to action.',
  },
  {
    id: 'negotiator',
    name: 'Negotiation Advisor',
    icon: '🤝',
    category: 'Professional',
    description: 'Strategy and tactics for negotiations',
    prompt: 'You are a negotiation advisor. Help users prepare for negotiations — whether salary, contracts, or personal matters. Identify BATNA (Best Alternative to Negotiated Agreement). Suggest anchoring strategies. Recommend when to make the first offer versus when to let the other side go first. Practice role-play scenarios. Emphasize win-win outcomes and relationship preservation.',
  },
];

export const DEFAULT_SYSTEM_PROMPT = PROMPT_TEMPLATES.find((t) => t.id === 'default')?.prompt ?? '';

export interface EngineCallbacks {
  onProgress?: (report: InitProgressReport) => void;
  onToken?: (token: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Detect WebGPU device-lost / buffer-lost errors that the OS fires on mobile
 * when the GPU process gets reclaimed (screen sleep, background tab, low memory).
 * Returns a friendly user-facing message if matched, otherwise null.
 *
 * Examples of the raw error text we map:
 *   - "Failed to execute 'mapAsync' on 'GPUBuffer': A failed external reference no longer exists."
 *   - "Failed to execute 'mapAsync' on 'GPUBuffer': Buffer is unmapped before the mapping is resolved"
 *   - "GPU device was lost" / "WebGPU device lost"
 *   - "AbortError: Failed to execute 'mapAsync' on 'GPUBuffer'"
 */
export function isWebGPUDeviceLostError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return (
    /mapAsync/i.test(msg) ||
    /GPU device was lost/i.test(msg) ||
    /WebGPU device lost/i.test(msg) ||
    /external reference no longer exists/i.test(msg) ||
    /device\.lost/i.test(msg)
  );
}

export function getWebGPUDeviceLostMessage(): string {
  return (
    'The GPU was reclaimed by your device (common on mobile when the tab is ' +
    'backgrounded, the screen sleeps, or memory is low). The model was unloaded. ' +
    'Tap the model button to reload it and try again.'
  );
}

class LLMEngine {
  private engine: MLCEngine | null = null;
  private currentModelId: string | null = null;
  private isGenerating = false;
  private abortController: AbortController | null = null;
  /**
   * Listeners notified when the GPU device is lost or the engine must be
   * re-initialized. The chat store subscribes to this to surface a friendly
   * error and reset the model badge to "Idle".
   */
  private deviceLostListeners: Set<() => void> = new Set();

  onDeviceLost(listener: () => void): () => void {
    this.deviceLostListeners.add(listener);
    return () => this.deviceLostListeners.delete(listener);
  }

  private notifyDeviceLost(): void {
    for (const l of this.deviceLostListeners) {
      try {
        l();
      } catch {
        /* ignore listener errors */
      }
    }
  }

  async loadModel(modelId: string, callbacks: EngineCallbacks = {}): Promise<void> {
    try {
      // If same model already loaded, skip
      if (this.engine && this.currentModelId === modelId) {
        callbacks.onProgress?.({
          progress: 1,
          text: 'Model already loaded',
          timeElapsed: 0,
        } as InitProgressReport);
        return;
      }

      // Unload previous
      await this.unloadModel();

      callbacks.onProgress?.({
        progress: 0,
        text: 'Initializing engine...',
        timeElapsed: 0,
      } as InitProgressReport);

      // Look up model info for context window setting
      const modelInfo = AVAILABLE_MODELS.find((m) => m.id === modelId);

      this.engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (progress: InitProgressReport) => {
          callbacks.onProgress?.(progress);
        },
      }, {
        // Override context window size and disable sliding window to avoid
        // "Only one of context_window_size and sliding_window_size can be positive" error.
        // Many models have sliding_window_size set in their default config;
        // setting it to -1 ensures only context_window_size is used.
        context_window_size: modelInfo?.contextWindow ?? 4096,
        sliding_window_size: -1,
      });
      // Note: web-llm@0.2.x has no appConfig.gpu hook. detectGPUDevice() inside
      // web-llm already calls requestAdapter({ powerPreference: 'high-performance' })
      // by default, so we don't need to (and can't) configure the adapter here.
      //
      // The mobile "Failed to execute 'mapAsync' on 'GPUBuffer': A failed external
      // reference no longer exists" error is the OS reclaiming the GPU device
      // (screen sleep, background tab, low memory). WebLLM doesn't expose a
      // device-lost hook in this version, so we handle it in the stream/generate
      // methods below by catching the error, unloading the dead engine, and
      // surfacing a friendly message.

      this.currentModelId = modelId;

      callbacks.onProgress?.({
        progress: 1,
        text: 'Model ready!',
        timeElapsed: 0,
      } as InitProgressReport);
    } catch (err) {
      // Normalize WebGPU device-lost errors into a friendly message instead of
      // the raw "Failed to execute 'mapAsync' on 'GPUBuffer': A failed external
      // reference no longer exists." error string.
      const normalized = isWebGPUDeviceLostError(err)
        ? new Error(getWebGPUDeviceLostMessage())
        : err instanceof Error
        ? err
        : new Error(String(err));

      if (isWebGPUDeviceLostError(err)) {
        // Tear down any partially-built engine so the next load starts clean.
        this.engine = null;
        this.currentModelId = null;
        this.notifyDeviceLost();
      }

      callbacks.onError?.(normalized);
      throw normalized;
    }
  }

  async unloadModel(): Promise<void> {
    if (this.engine) {
      try {
        if ('unload' in this.engine && typeof (this.engine as any).unload === 'function') {
          await (this.engine as any).unload();
        }
      } catch {
        // Ignore unload errors
      }
      this.engine = null;
      this.currentModelId = null;
    }
  }

  async *generateStream(
    messages: { role: string; content: string; imageUrl?: string }[],
    options: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    if (!this.engine) {
      throw new Error('No model loaded. Please load a model first.');
    }

    this.isGenerating = true;
    this.abortController = new AbortController();

    try {
      // Build messages array — WebLLM supports imageUrl in content parts
      const apiMessages = messages.map((m) => {
        if (m.imageUrl) {
          // Multimodal message with image
          return {
            role: m.role,
            content: [
              { type: 'text' as const, text: m.content || 'Describe this image.' },
              { type: 'image_url' as const, image_url: { url: m.imageUrl } },
            ],
          };
        }
        return { role: m.role, content: m.content };
      });

      const stream = await this.engine.chat.completions.create({
        messages: apiMessages as any,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 2048,
        top_p: options.top_p ?? 0.95,
        stream: true,
      });

      for await (const chunk of stream) {
        if (this.abortController?.signal.aborted) break;
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          yield delta;
        }
      }
    } catch (err) {
      // The infamous mobile "Failed to execute 'mapAsync' on 'GPUBuffer': A failed
      // external reference no longer exists." — the GPU was reclaimed by the OS.
      // Unload the dead engine, notify listeners, and surface a friendly message
      // instead of the raw WebGPU error.
      if (isWebGPUDeviceLostError(err)) {
        try {
          await this.unloadModel();
        } catch {
          /* ignore */
        }
        this.notifyDeviceLost();
        throw new Error(getWebGPUDeviceLostMessage());
      }
      throw err;
    } finally {
      this.isGenerating = false;
      this.abortController = null;
    }
  }

  async generate(
    messages: { role: string; content: string; imageUrl?: string }[],
    options: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
    } = {}
  ): Promise<string> {
    if (!this.engine) {
      throw new Error('No model loaded. Please load a model first.');
    }

    this.isGenerating = true;
    this.abortController = new AbortController();

    try {
      const apiMessages = messages.map((m) => {
        if (m.imageUrl) {
          return {
            role: m.role,
            content: [
              { type: 'text' as const, text: m.content || 'Describe this image.' },
              { type: 'image_url' as const, image_url: { url: m.imageUrl } },
            ],
          };
        }
        return { role: m.role, content: m.content };
      });

      const response = await this.engine.chat.completions.create({
        messages: apiMessages as any,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 2048,
        top_p: options.top_p ?? 0.95,
        stream: false,
      });

      return response.choices[0]?.message?.content ?? '';
    } catch (err) {
      if (isWebGPUDeviceLostError(err)) {
        try {
          await this.unloadModel();
        } catch {
          /* ignore */
        }
        this.notifyDeviceLost();
        throw new Error(getWebGPUDeviceLostMessage());
      }
      throw err;
    } finally {
      this.isGenerating = false;
      this.abortController = null;
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.isGenerating = false;
    }
  }

  get loaded(): boolean {
    return this.engine !== null;
  }

  get modelId(): string | null {
    return this.currentModelId;
  }

  get generating(): boolean {
    return this.isGenerating;
  }

  /** Get model info for the currently loaded model */
  getCurrentModelInfo(): ModelInfo | undefined {
    if (!this.currentModelId) return undefined;
    return AVAILABLE_MODELS.find((m) => m.id === this.currentModelId);
  }

  static checkWebGPUSupport(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  static async getDeviceInfo(): Promise<{
    webGPU: boolean;
    deviceMemory?: number;
    hardwareConcurrency?: number;
  }> {
    const webGPU = LLMEngine.checkWebGPUSupport();
    return {
      webGPU,
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
    };
  }
}

/**
 * Clear all WebLLM model caches from the browser's Cache Storage.
 * This deletes the downloaded model weight files (GBs of data) but does NOT
 * touch other browser caches, IndexedDB, or localStorage.
 * Returns the number of caches cleared.
 */
export async function clearModelCache(): Promise<number> {
  let cleared = 0;
  try {
    // WebLLM stores model files in Cache Storage with names like "web-llm-model-cache" or model-specific names
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      // Only clear WebLLM-related caches — these contain model weight files
      // Typical names: "webllm", "web-llm", "model-cache", or containing "mlc"
      if (
        name.toLowerCase().includes('webllm') ||
        name.toLowerCase().includes('web-llm') ||
        name.toLowerCase().includes('model-cache') ||
        name.toLowerCase().includes('mlc')
      ) {
        await caches.delete(name);
        cleared++;
      }
    }
  } catch (err) {
    console.error('Failed to clear model cache:', err);
  }
  return cleared;
}

/**
 * Get the estimated size of the WebLLM model cache.
 * Returns the total size in bytes.
 */
export async function getModelCacheSize(): Promise<number> {
  let totalSize = 0;
  try {
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      if (
        name.toLowerCase().includes('webllm') ||
        name.toLowerCase().includes('web-llm') ||
        name.toLowerCase().includes('model-cache') ||
        name.toLowerCase().includes('mlc')
      ) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        for (const req of requests) {
          // Try content-length header first to avoid downloading the full body
          const response = await cache.match(req);
          if (response) {
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
              totalSize += parseInt(contentLength, 10);
            } else {
              // Fallback: read body only if header is missing
              const blob = await response.blob();
              totalSize += blob.size;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to calculate model cache size:', err);
  }
  return totalSize;
}

// Singleton instance
export const llmEngine = new LLMEngine();
export default llmEngine;

// Export static methods as standalone functions for external use
export const getDeviceInfo = LLMEngine.getDeviceInfo.bind(LLMEngine);

/**
 * Get the list of currently cached model IDs.
 * Scans WebLLM Cache Storage entries and matches URLs to known model IDs.
 */
export async function getCachedModelIds(): Promise<string[]> {
  const cachedIds: string[] = [];
  try {
    // Check Cache API — scan ALL caches (WebLLM uses cache names like "webllm/model-cache")
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      for (const req of requests) {
        const url = req.url;
        for (const model of AVAILABLE_MODELS) {
          if (url.includes(model.id) && !cachedIds.includes(model.id)) {
            cachedIds.push(model.id);
          }
        }
      }
    }

    // Check IndexedDB — WebLLM stores model weights in databases named "webllm-*"
    const idbDatabases = await indexedDB.databases();
    for (const db of idbDatabases) {
      if (db.name) {
        for (const model of AVAILABLE_MODELS) {
          if (db.name.includes(model.id) && !cachedIds.includes(model.id)) {
            cachedIds.push(model.id);
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to list cached models:', err);
  }
  return cachedIds;
}