import { create } from 'zustand';
import type { ModelLoadState, ModelInfo } from '@/types';
import { llmEngine, getDeviceInfo, AVAILABLE_MODELS } from '@/lib/llm-engine';

interface ModelStore {
  availableModels: ModelInfo[];
  selectedModel: string;
  loadState: ModelLoadState;
  webGPUSupported: boolean;
  deviceInfo: { webGPU: boolean; deviceMemory?: number; hardwareConcurrency?: number };

  setSelectedModel: (modelId: string) => void;
  loadModel: (modelId?: string) => Promise<void>;
  unloadModel: () => Promise<void>;
  setLoadState: (state: Partial<ModelLoadState>) => void;
  detectCapabilities: () => Promise<void>;
}

export const useModelStore = create<ModelStore>((set, get) => ({
  availableModels: AVAILABLE_MODELS,
  selectedModel: '',
  loadState: {
    status: 'idle',
    progress: 0,
    progressText: '',
  },
  webGPUSupported: false,
  deviceInfo: { webGPU: false },

  setSelectedModel: (modelId) => set({ selectedModel: modelId }),

  loadModel: async (modelId) => {
    const id = modelId || get().selectedModel;
    if (!id) {
      set({
        loadState: {
          status: 'error',
          progress: 0,
          progressText: '',
          error: 'No model selected',
        },
      });
      return;
    }

    set({
      loadState: { status: 'loading', progress: 0, progressText: 'Starting...' },
    });

    try {
      await llmEngine.loadModel(id, {
        onProgress: (report) => {
          set({
            loadState: {
              status: 'loading',
              progress: report.progress,
              progressText: report.text,
            },
          });
        },
        onError: (error) => {
          set({
            loadState: {
              status: 'error',
              progress: 0,
              progressText: '',
              error: error.message,
            },
          });
        },
      });

      set({
        loadState: { status: 'ready', progress: 1, progressText: 'Model ready!' },
        selectedModel: id,
      });
    } catch (err) {
      set({
        loadState: {
          status: 'error',
          progress: 0,
          progressText: '',
          error: err instanceof Error ? err.message : 'Failed to load model',
        },
      });
    }
  },

  unloadModel: async () => {
    await llmEngine.unloadModel();
    set({
      loadState: { status: 'idle', progress: 0, progressText: '' },
    });
  },

  setLoadState: (partial) =>
    set((state) => ({ loadState: { ...state.loadState, ...partial } })),

  detectCapabilities: async () => {
    const deviceInfo = await getDeviceInfo();
    set({
      webGPUSupported: deviceInfo.webGPU,
      deviceInfo,
    });
  },
}));

// When the WebGPU device is reclaimed (mobile background, screen sleep, OOM),
// reset the model badge to "Idle" so the user can see the model is no longer
// loaded and reload it. This is wired up here (outside the store factory) so
// we have a single subscription that survives StrictMode double-invoke.
if (typeof window !== 'undefined') {
  llmEngine.onDeviceLost(() => {
    const state = useModelStore.getState();
    state.setLoadState({
      status: 'idle',
      progress: 0,
      progressText: '',
      // Keep last selectedModel so the UI can show "Tap to reload".
    });
  });
}