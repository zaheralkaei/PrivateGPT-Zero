import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, HardDrive, Wifi, WifiOff, Eye, Sparkles, RotateCcw, Trash2, Database, Info, Save, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Badge, Switch } from '@/components/common/ui';
import { useModelStore } from '@/stores/model-store';
import { useBenchmarkStore } from '@/stores/benchmark-store';
import { useChatStore } from '@/stores/chat-store';
import { PROMPT_TEMPLATES, PROMPT_TEMPLATE_CATEGORIES, clearModelCache, getModelCacheSize, getCachedModelIds } from '@/lib/llm-engine';
import type { PromptCategory } from '@/lib/llm-engine';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_PROMPT = PROMPT_TEMPLATES.find((t) => t.id === 'default')?.prompt ?? '';

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { availableModels, selectedModel, loadState, webGPUSupported, deviceInfo, setSelectedModel, loadModel, unloadModel } =
    useModelStore();
  const { stats, showPanel, togglePanel } = useBenchmarkStore();
  const { settings, updateSettings } = useChatStore();

  const [modelFilter, setModelFilter] = React.useState('');
  const [showTemplates, setShowTemplates] = React.useState(false);
  const [templateCategory, setTemplateCategory] = React.useState<PromptCategory | 'All' | 'Custom'>('All');
  const [previewTemplate, setPreviewTemplate] = React.useState<string | null>(null);
  const [cacheSize, setCacheSize] = React.useState<string>('');
  const [clearingCache, setClearingCache] = React.useState(false);
  const [cachedModelIds, setCachedModelIds] = React.useState<string[]>([]);
  const [showAbout, setShowAbout] = React.useState(false);
  const [customTemplateName, setCustomTemplateName] = React.useState('');
  const [showSaveTemplate, setShowSaveTemplate] = React.useState(false);
  const [customUserTemplates, setCustomUserTemplates] = React.useState<any[]>([]);

  // Derive effective cached list: browser cache + currently loaded model
  const effectiveCachedIds = React.useMemo(() => {
    const ids = new Set(cachedModelIds);
    // If a model is loaded, it's definitely cached
    if (loadState.status === 'ready' && selectedModel) {
      ids.add(selectedModel);
    }
    return Array.from(ids);
  }, [cachedModelIds, loadState.status, selectedModel]);

  // Load custom templates from localStorage
  React.useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('privategpt-zero-custom-templates') || '[]');
    setCustomUserTemplates(saved);
  }, [open]);

  // Load cache size and cached model IDs on mount and when panel opens
  React.useEffect(() => {
    if (open) {
      getModelCacheSize().then((bytes) => {
        if (bytes > 0) {
          const gb = (bytes / (1024 * 1024 * 1024)).toFixed(2);
          const mb = (bytes / (1024 * 1024)).toFixed(1);
          setCacheSize(bytes >= 1024 * 1024 * 1024 ? gb + ' GB' : mb + ' MB');
        } else {
          setCacheSize('0 MB');
        }
      });
      getCachedModelIds().then(setCachedModelIds);
    }
  }, [open]);

  const filteredModels = availableModels.filter(
    (m) =>
      m.name.toLowerCase().includes(modelFilter.toLowerCase()) ||
      m.id.toLowerCase().includes(modelFilter.toLowerCase()),
  );

  const textModels = filteredModels.filter((m) => !m.vision);
  const visionModels = filteredModels.filter((m) => m.vision);

  const filteredTemplates =
    templateCategory === 'All'
      ? [...PROMPT_TEMPLATES, ...customUserTemplates]
      : templateCategory === 'Custom'
        ? customUserTemplates
        : PROMPT_TEMPLATES.filter((t) => t.category === templateCategory);

  const previewPrompt = previewTemplate
    ? [...PROMPT_TEMPLATES, ...customUserTemplates].find((t) => t.id === previewTemplate)?.prompt ?? null
    : null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md sm:max-w-md lg:max-w-lg bg-background border-l border-border z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">Settings</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-4 space-y-6">
              {/* Model Selection */}
              <section>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Cpu className="h-4 w-4" /> Model Selection
                </h3>

                <div className="space-y-3">
                  {/* Device capabilities */}
                  <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      {webGPUSupported ? (
                        <><Wifi className="h-3 w-3 text-green-400" /> WebGPU Supported</>
                      ) : (
                        <><WifiOff className="h-3 w-3 text-yellow-400" /> WebGPU Not Available (using WASM fallback)</>
                      )}
                    </div>
                    {deviceInfo.deviceMemory && (
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-3 w-3" /> ~{deviceInfo.deviceMemory} GB RAM
                      </div>
                    )}
                    {deviceInfo.hardwareConcurrency && (
                      <div>CPU cores: {deviceInfo.hardwareConcurrency}</div>
                    )}
                  </div>

                  {/* Text-only models */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Text Models</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Choose a model...</option>
                      {textModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.size}, {((model.contextWindow || 4096) / 1024).toFixed(model.contextWindow && model.contextWindow % 1024 === 0 ? 0 : 1)}k ctx){effectiveCachedIds.includes(model.id) ? ' ✓ Cached' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Vision models */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Eye className="h-3 w-3" /> Vision Models (Image + Text)
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Choose a model...</option>
                      {visionModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          🔍 {model.name} ({model.size}, {((model.contextWindow || 4096) / 1024).toFixed(model.contextWindow && model.contextWindow % 1024 === 0 ? 0 : 1)}k ctx){effectiveCachedIds.includes(model.id) ? ' ✓ Cached' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected model info */}
                  {selectedModel && (() => {
                    const model = availableModels.find((m) => m.id === selectedModel);
                    if (!model) return null;
                    return (
                      <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-1">
                        <div className="font-medium text-sm">{model.name}</div>
                        <div className="text-muted-foreground">{model.description}</div>
                        <div>Size: {model.size} | Quantization: {model.quantization}</div>
                        <div>Estimated RAM: {model.estimatedRAM}</div>
                        {model.webGPUOnly && (
                          <div className="text-yellow-500">⚠ Requires WebGPU</div>
                        )}
                        {model.vision && (
                          <div className="text-blue-400 flex items-center gap-1">
                            <Eye className="h-3 w-3" /> Supports image input — upload photos for analysis
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Load / Unload */}
                  {loadState.status === 'ready' ? (
                    <Button variant="outline" className="w-full" onClick={unloadModel}>
                      Unload Model
                    </Button>
                  ) : loadState.status === 'loading' ? (
                    <div className="space-y-2">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${loadState.progress * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{loadState.progressText}</p>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => loadModel()}
                      disabled={!selectedModel}
                    >
                      Load Model
                    </Button>
                  )}

                  {loadState.status === 'error' && (
                    <p className="text-xs text-destructive">{loadState.error}</p>
                  )}
                </div>
              </section>

              {/* Generation Settings */}
              <section>
                <h3 className="text-sm font-semibold mb-3">Generation Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Temperature: {settings.temperature.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.05"
                      value={settings.temperature}
                      onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                      className="w-full accent-primary h-6"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Max Tokens: {settings.maxTokens}
                    </label>
                    <input
                      type="range"
                      min="256"
                      max="4096"
                      step="256"
                      value={settings.maxTokens}
                      onChange={(e) => updateSettings({ maxTokens: parseInt(e.target.value) })}
                      className="w-full accent-primary h-6"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Top P: {settings.topP.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.topP}
                      onChange={(e) => updateSettings({ topP: parseFloat(e.target.value) })}
                      className="w-full accent-primary h-6"
                    />
                  </div>

                  <Switch
                    checked={settings.streamOutput}
                    onChange={(v) => updateSettings({ streamOutput: v })}
                    label="Stream output"
                  />
                </div>
              </section>

              {/* ── System Prompt with Template Picker ── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">System Prompt</h3>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateSettings({ systemPrompt: DEFAULT_PROMPT });
                        setPreviewTemplate(null);
                      }}
                      className="text-xs"
                      title="Reset to default"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                    <Button
                      variant={showTemplates ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="text-xs"
                    >
                      <Sparkles className="h-3 w-3 mr-1" /> Templates
                    </Button>
                  </div>
                </div>

                {/* Template picker */}
                {showTemplates && (
                  <div className="mb-3 border border-border rounded-lg overflow-hidden">
                    {/* Category tabs */}
                    <div className="flex overflow-x-auto border-b border-border bg-muted/30 px-2 py-1.5 gap-1 scrollbar-thin scrollbar-h-thumb-gray-400">
                      <button
                        onClick={() => setTemplateCategory('All')}
                        className={cn(
                          'px-3 py-2 rounded text-xs whitespace-nowrap transition-colors min-h-[36px]',
                          templateCategory === 'All'
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                        )}
                      >
                        All ({PROMPT_TEMPLATES.length})
                      </button>
                      {PROMPT_TEMPLATE_CATEGORIES.map((cat) => {
                        const count = PROMPT_TEMPLATES.filter((t) => t.category === cat).length;
                        return (
                          <button
                            key={cat}
                            onClick={() => setTemplateCategory(cat)}
                            className={cn(
                              'px-3 py-2 rounded text-xs whitespace-nowrap transition-colors min-h-[36px]',
                              templateCategory === cat
                                ? 'bg-primary text-primary-foreground font-medium'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                            )}
                          >
                            {cat} ({count})
                          </button>
                        );
                      })}
                      {customUserTemplates.length > 0 && (
                        <button
                          onClick={() => setTemplateCategory('Custom')}
                          className={cn(
                            'px-3 py-2 rounded text-xs whitespace-nowrap transition-colors min-h-[36px]',
                            templateCategory === 'Custom'
                              ? 'bg-primary text-primary-foreground font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                          )}
                        >
                          ⭐ Custom ({customUserTemplates.length})
                        </button>
                      )}
                    </div>

                    {/* Template cards */}
                    <div className="max-h-64 overflow-y-auto p-2 space-y-1.5">
                      {filteredTemplates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            updateSettings({ systemPrompt: t.prompt });
                            setPreviewTemplate(t.id);
                          }}
                          className={cn(
                            'w-full text-left p-2.5 rounded-md border transition-all group',
                            previewTemplate === t.id
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-transparent hover:bg-accent/50 text-foreground',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">{t.icon}</span>
                            <span className="font-medium text-sm">{t.name}</span>
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {t.category}
                            </span>
                            {t.id.startsWith('custom-') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete custom template "' + t.name + '"?')) {
                                    const updated = JSON.parse(localStorage.getItem('privategpt-zero-custom-templates') || '[]').filter((ct: any) => ct.id !== t.id);
                                    localStorage.setItem('privategpt-zero-custom-templates', JSON.stringify(updated));
                                    setCustomUserTemplates(updated);
                                    if (previewTemplate === t.id) setPreviewTemplate(null);
                                  }
                                }}
                                className="ml-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-destructive hover:text-destructive/80 active:text-destructive/80 transition-opacity p-2 sm:p-0.5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
                                title="Delete template"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {t.description}
                          </p>
                        </button>
                      ))}
                    </div>

                    {/* Preview of selected prompt */}
                    {previewPrompt && (
                      <div className="border-t border-border p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            Prompt Preview
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] min-h-[36px] px-2"
                            onClick={() => {
                              /* The textarea already has the prompt — user can freely edit */
                            }}
                          >
                            Edit below
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 line-clamp-3">
                          {previewPrompt}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <textarea
                  value={settings.systemPrompt}
                  onChange={(e) => {
                    updateSettings({ systemPrompt: e.target.value });
                    setPreviewTemplate(null); // Clear preview when user manually edits
                  }}
                  className="w-full min-h-[6rem] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Write your custom system prompt here..."
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  This sets the AI's personality and behavior. Select a template above or write your own.
                </p>

                {/* Save Custom Template — right under the prompt editor */}
                {settings.systemPrompt && settings.systemPrompt !== DEFAULT_PROMPT && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5" /> Save Custom Template
                    </h4>
                    {showSaveTemplate ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={customTemplateName}
                          onChange={(e) => setCustomTemplateName(e.target.value)}
                          placeholder="Template name (e.g., My Coding Helper)"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            disabled={!customTemplateName.trim()}
                            onClick={() => {
                              const customTemplates = JSON.parse(localStorage.getItem('privategpt-zero-custom-templates') || '[]');
                              // Check for duplicate name
                              const duplicateName = customTemplates.find((ct: any) => ct.name === customTemplateName.trim());
                              if (duplicateName) {
                                if (!confirm('A template named "' + customTemplateName.trim() + '" already exists. Replace it?')) return;
                                // Remove the existing one before adding
                                const filtered = customTemplates.filter((ct: any) => ct.name !== customTemplateName.trim());
                                filtered.push({
                                  id: 'custom-' + Date.now(),
                                  name: customTemplateName.trim(),
                                  icon: '⭐',
                                  category: 'Custom',
                                  description: 'Custom template',
                                  prompt: settings.systemPrompt,
                                });
                                localStorage.setItem('privategpt-zero-custom-templates', JSON.stringify(filtered));
                                setCustomUserTemplates(filtered);
                              } else {
                                customTemplates.push({
                                  id: 'custom-' + Date.now(),
                                  name: customTemplateName.trim(),
                                  icon: '⭐',
                                  category: 'Custom',
                                  description: 'Custom template',
                                  prompt: settings.systemPrompt,
                                });
                                localStorage.setItem('privategpt-zero-custom-templates', JSON.stringify(customTemplates));
                                setCustomUserTemplates(customTemplates);
                              }
                              setCustomTemplateName('');
                              setShowSaveTemplate(false);
                            }}
                          >
                            Save Template
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setShowSaveTemplate(false); setCustomTemplateName(''); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowSaveTemplate(true)}
                      >
                        <Save className="h-3.5 w-3.5 mr-2" /> Save current prompt as template
                      </Button>
                    )}
                  </div>
                )}
              </section>

              {/* Appearance */}
              <section>
                <h3 className="text-sm font-semibold mb-3">Appearance</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Theme</label>
                    <select
                      value={settings.theme}
                      onChange={(e) => {
                        const theme = e.target.value as 'light' | 'dark' | 'system';
                        updateSettings({ theme });
                        const root = document.documentElement;
                        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        if (theme === 'dark' || (theme === 'system' && systemDark)) {
                          root.classList.add('dark');
                        } else {
                          root.classList.remove('dark');
                        }
                      }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="system">System</option>
                    </select>
                  </div>

                  <Switch
                    checked={settings.showBenchmark}
                    onChange={(v) => {
                      updateSettings({ showBenchmark: v });
                      togglePanel();
                    }}
                    label="Show benchmark stats"
                  />

                  <Switch
                    checked={settings.persistChat}
                    onChange={(v) => updateSettings({ persistChat: v })}
                    label="Save conversations locally"
                  />
                </div>
              </section>

              {/* Model Cache */}
              <section>
                <h3 className="text-sm font-semibold mb-3">Model Cache</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">Downloaded model files</p>
                        <p className="text-[10px] text-muted-foreground">
                          Cached in browser storage for faster loading — {cacheSize || 'calculating...'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Show which models are cached */}
                  {cachedModelIds.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Cached models</p>
                      {cachedModelIds.map((id) => {
                        const model = availableModels.find((m) => m.id === id);
                        return (
                          <div key={id} className="flex items-center gap-2 text-xs bg-background/50 rounded px-2.5 py-1.5">
                            <span className="text-green-400 text-[10px]">✓</span>
                            <span className="font-medium">{model ? model.name : id}</span>
                            {model && <span className="text-muted-foreground">({model.size})</span>}
                            {model?.vision && <span className="text-blue-400">🔍</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {cachedModelIds.length === 0 && cacheSize !== '0 MB' && (
                    <p className="text-[10px] text-muted-foreground italic">No cached models detected</p>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={clearingCache}
                    onClick={async () => {
                      if (!window.confirm('Clear all downloaded model files? You will need to re-download the model next time you load it.')) return;
                      setClearingCache(true);
                      try {
                        await unloadModel();
                        const cleared = await clearModelCache();
                        setCacheSize('0 MB');
                        setCachedModelIds([]);
                        if (cleared > 0) {
                          alert('Model cache cleared! Freed up storage space.');
                        } else {
                          alert('No model cache found to clear.');
                        }
                      } catch (err) {
                        alert('Failed to clear cache: ' + (err instanceof Error ? err.message : 'Unknown error'));
                      } finally {
                        setClearingCache(false);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    {clearingCache ? 'Clearing...' : 'Clear Model Cache'}
                  </Button>
                  <p className="text-[10px] text-muted-foreground">
                    This only removes downloaded model weight files from your browser cache. Your conversations, settings, and other browser data are not affected.
                  </p>
                </div>
              </section>

              {/* Privacy notice */}
              <section className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground">
                  🔒 <strong>Privacy Notice:</strong> All AI processing happens locally in your browser.
                  No prompts, conversations, or model outputs are transmitted to any server.
                  Conversations are stored locally using IndexedDB.
                </p>
              </section>

              {/* Keyboard shortcuts */}
              <section>
                <h3 className="text-sm font-semibold mb-3">Keyboard Shortcuts</h3>
                <div className="space-y-1 text-xs">
                  {[
                    ['Ctrl+Shift+N', 'New chat'],
                    ['Ctrl+,', 'Open settings'],
                    ['Ctrl+Shift+S', 'Toggle sidebar'],
                    ['Ctrl+Shift+P', 'Privacy info'],
                    ['Ctrl+Shift+B', 'Benchmark stats'],
                    ['Enter', 'Send message'],
                    ['Shift+Enter', 'New line'],
                    ['Escape', 'Close panel/dialog'],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex justify-between py-1">
                      <span className="text-muted-foreground">{desc}</span>
                      <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">{key}</kbd>
                    </div>
                  ))}
                </div>
              </section>

              {/* About */}
              <section className="bg-muted/50 rounded-lg p-4">
                <button
                  onClick={() => setShowAbout(!showAbout)}
                  className="w-full flex items-center justify-between text-sm font-semibold"
                >
                  <span className="flex items-center gap-2">
                    <Info className="h-4 w-4" /> About PrivateGPT Zero
                  </span>
                  <span className="text-muted-foreground text-xs">{showAbout ? '▲' : '▼'}</span>
                </button>
                <AnimatePresence>
                  {showAbout && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground text-sm">PrivateGPT Zero</p>
                        <p>A private ChatGPT alternative that runs entirely in your browser. No data is sent to any server.</p>
                        <p>We recommend using the larger models (3B+ parameters) for better quality responses, though they take longer to load initially. The smaller models (1B) are faster to load but produce less accurate results.</p>
                        <p>These open-source browser models are convenient and private but not as capable as closed-source cloud models. For sensitive information or when you don't want your data collected, and your tasks are relatively simple, this is the right tool for the job.</p>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-amber-600 dark:text-amber-400">
                          ⚠️ AI can make mistakes. Verify important information independently. Use AI responsibly.
                        </div>
                        <div className="bg-background/50 border border-border rounded-lg p-2.5">
                          📌 Bookmark this website! After your first visit and model download, the app works offline — no server needed.
                        </div>
                        <div className="border-t border-border pt-2 mt-2">
                          <p className="font-medium text-foreground">Built with</p>
                          <p>React 19 · TypeScript · Tailwind CSS · Zustand · WebLLM (MLC AI) · Framer Motion · IndexedDB</p>
                        </div>
                        <p className="font-medium text-foreground pt-1">
                          Designed & Conceptualized by{' '}
                          <a
                            href="https://github.com/zaheralkaei"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-2 hover:opacity-80"
                          >
                            Zaher Alkaei
                          </a>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}