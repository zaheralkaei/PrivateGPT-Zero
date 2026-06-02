import { create } from 'zustand';
import type { BenchmarkStats } from '@/types';

interface BenchmarkStore {
  stats: BenchmarkStats;
  showPanel: boolean;
  firstTokenTimestamp: number | null;
  generationStartTimestamp: number | null;
  tokenCount: number;

  updateStats: (partial: Partial<BenchmarkStats>) => void;
  startGeneration: () => void;
  recordToken: () => void;
  endGeneration: (totalTokens: number, totalTimeMs: number) => void;
  resetStats: () => void;
  togglePanel: () => void;
}

export const useBenchmarkStore = create<BenchmarkStore>((set, get) => ({
  stats: {
    tokensPerSecond: 0,
    timeToFirstToken: 0,
    totalTokens: 0,
    totalTimeMs: 0,
    memoryUsage: 0,
    modelSize: '',
  },
  showPanel: false,
  firstTokenTimestamp: null,
  generationStartTimestamp: null,
  tokenCount: 0,

  updateStats: (partial) =>
    set((state) => ({ stats: { ...state.stats, ...partial } })),

  startGeneration: () => {
    set({
      generationStartTimestamp: performance.now(),
      firstTokenTimestamp: null,
      tokenCount: 0,
    });
  },

  recordToken: () => {
    const { generationStartTimestamp, firstTokenTimestamp, tokenCount } = get();
    const now = performance.now();
    const count = tokenCount + 1;
    const firstToken = firstTokenTimestamp ?? now;

    const elapsed = now - (generationStartTimestamp ?? now);
    const tps = elapsed > 0 ? (count / elapsed) * 1000 : 0;
    const ttft = firstToken - (generationStartTimestamp ?? firstToken);

    set({
      tokenCount: count,
      firstTokenTimestamp: firstToken,
      stats: {
        ...get().stats,
        tokensPerSecond: Math.round(tps * 10) / 10,
        timeToFirstToken: Math.round(ttft),
        totalTokens: count,
        totalTimeMs: Math.round(elapsed),
      },
    });
  },

  endGeneration: (totalTokens, totalTimeMs) => {
    const { generationStartTimestamp, firstTokenTimestamp } = get();
    const ttft = firstTokenTimestamp
      ? firstTokenTimestamp - (generationStartTimestamp ?? 0)
      : 0;
    const tps = totalTimeMs > 0 ? (totalTokens / totalTimeMs) * 1000 : 0;

    set((state) => ({
      stats: {
        ...state.stats,
        tokensPerSecond: Math.round(tps * 10) / 10,
        timeToFirstToken: Math.round(ttft),
        totalTokens,
        totalTimeMs: Math.round(totalTimeMs),
      },
    }));
  },

  resetStats: () =>
    set({
      stats: {
        tokensPerSecond: 0,
        timeToFirstToken: 0,
        totalTokens: 0,
        totalTimeMs: 0,
        memoryUsage: 0,
        modelSize: '',
      },
      firstTokenTimestamp: null,
      generationStartTimestamp: null,
      tokenCount: 0,
    }),

  togglePanel: () => set((state) => ({ showPanel: !state.showPanel })),
}));