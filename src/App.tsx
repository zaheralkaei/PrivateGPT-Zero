import React, { useEffect, useState, useCallback } from 'react';
import { Menu, Settings, Zap, Moon, Sun, Monitor, X, AlertTriangle, Shield, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { PrivacyPage } from '@/components/privacy/PrivacyPage';
import { ImportDialog } from '@/components/chat/ImportDialog';
import { Badge, Button } from '@/components/common/ui';
import { useChatStore } from '@/stores/chat-store';
import { useModelStore } from '@/stores/model-store';
import { AVAILABLE_MODELS, DEFAULT_SYSTEM_PROMPT } from '@/lib/llm-engine';
import { useBenchmarkStore } from '@/stores/benchmark-store';
import { useTheme } from '@/hooks/useTheme';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(true);

  const { settings, loadSettings, loadConversations, isGenerating } = useChatStore();
  const { loadState, selectedModel, detectCapabilities } = useModelStore();
  const { showPanel, togglePanel } = useBenchmarkStore();
  const { applyTheme } = useTheme();

  // Initialize
  useEffect(() => {
    loadSettings();
    loadConversations();
    detectCapabilities();

    const bannerDismissed = localStorage.getItem('privategpt-zero-banner-dismissed');
    if (bannerDismissed) setShowPrivacyBanner(false);
  }, []);

  // Keep sidebar default-open state in sync with viewport width crossing the lg breakpoint
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Apply theme on settings change
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme, applyTheme]);

  // Before unload warning when generating
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isGenerating) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isGenerating]);

  const handleNewChat = useCallback(() => {
    useChatStore.getState().createConversation();
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        if (e.key === 'Escape') {
          setSettingsOpen(false);
          setPrivacyOpen(false);
          setImportOpen(false);
          setAboutOpen(false);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        handleNewChat();
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setPrivacyOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        togglePanel();
      } else if (e.key === 'Escape') {
        setSettingsOpen(false);
        setPrivacyOpen(false);
        setImportOpen(false);
        setAboutOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePanel, handleNewChat]);

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Privacy banner — in flow so it pushes content down, not overlaying the header */}
      <AnimatePresence>
        {showPrivacyBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 relative bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-green-500/30"
          >
            <div className="flex items-center justify-center gap-2 px-12 py-2.5 text-xs sm:text-sm text-center">
              <Shield className="h-4 w-4 text-green-500 shrink-0" />
              <span>
                🔒 PrivateGPT Zero — This AI runs entirely in your browser. <strong>No data is sent to any server.</strong>
              </span>
            </div>
            <button
              onClick={() => {
                setShowPrivacyBanner(false);
                localStorage.setItem('privategpt-zero-banner-dismissed', 'true');
              }}
              aria-label="Dismiss privacy banner"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground active:text-foreground h-11 w-11 sm:h-8 sm:w-8 flex items-center justify-center rounded-md"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data persistence warning */}
      {!settings.persistChat && (
        <div className="fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 text-xs text-yellow-400 flex items-center gap-2 max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Closing this tab will permanently remove this conversation. Enable storage in Settings.</span>
        </div>
      )}

      {/* App body: sidebar + main */}
      <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenPrivacy={() => setPrivacyOpen(true)}
        onImport={() => setImportOpen(true)}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-background/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                P0
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-semibold leading-tight">PrivateGPT Zero</h1>
                <p className="text-[10px] text-muted-foreground leading-tight truncate max-w-[200px]">
                  {currentModel ? currentModel.name : 'No model loaded'}
                  {currentModel?.vision ? ' 🔍' : ''}
                  {settings.systemPrompt && settings.systemPrompt !== DEFAULT_SYSTEM_PROMPT && (
                    <span className="ml-1 text-blue-500 dark:text-blue-400">• Custom prompt</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Model status */}
            <Badge
              variant={loadState.status === 'ready' ? 'success' : loadState.status === 'loading' ? 'secondary' : 'outline'}
              className="text-[10px] py-0.5"
            >
              {loadState.status === 'ready' ? '● Ready' : loadState.status === 'loading' ? `● ${Math.round(loadState.progress * 100)}%` : '● Idle'}
            </Badge>

            {/* Vision indicator */}
            {currentModel?.vision && (
              <Badge variant="secondary" className="text-[10px] py-0.5">
                🔍 Vision
              </Badge>
            )}

            {/* Stats toggle */}
            {loadState.status === 'ready' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePanel}
                className="h-11 w-11 sm:h-8 sm:w-8"
                title="Toggle benchmark stats"
              >
                <Zap className="h-4 w-4" />
              </Button>
            )}

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const next = settings.theme === 'dark' ? 'light' : settings.theme === 'light' ? 'system' : 'dark';
                useChatStore.getState().updateSettings({ theme: next });
                applyTheme(next);
              }}
              className="h-11 w-11 sm:h-8 sm:w-8"
              title={`Theme: ${settings.theme}`}
            >
              {settings.theme === 'dark' ? <Moon className="h-4 w-4" /> : settings.theme === 'light' ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="h-11 w-11 sm:h-8 sm:w-8"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* About */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAboutOpen(true)}
              className="h-11 w-11 sm:h-8 sm:w-8"
              title="About"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Chat area */}
        <ChatInterface onNewChat={handleNewChat} sidebarOpen={sidebarOpen} onOpenSettings={() => setSettingsOpen(true)} />
      </main>
      </div>

      {/* Settings panel */}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Privacy page */}
      <PrivacyPage open={privacyOpen} onClose={() => setPrivacyOpen(false)} />

      {/* Import dialog */}
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />

      {/* About dialog */}
      <AnimatePresence>
        {aboutOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setAboutOpen(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="pointer-events-auto w-[90vw] max-w-md max-h-[85vh] overflow-y-auto bg-background border border-border rounded-xl shadow-2xl p-6"
              >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">About PrivateGPT Zero</h2>
                <Button variant="ghost" size="icon" onClick={() => setAboutOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="text-foreground font-medium text-base">🛡️ PrivateGPT Zero</p>
                <p>A private ChatGPT alternative that runs entirely in your browser. No data is sent to any server.</p>
                <p>We recommend using the larger models (3B+ parameters) for better quality responses, though they take longer to load initially. The smaller models (1B) are faster to load but produce less accurate results.</p>
                <p>These open-source browser models are convenient and private but not as capable as closed-source cloud models. For sensitive information or when you don't want your data collected, and your tasks are relatively simple, this is the right tool for the job.</p>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-600 dark:text-amber-400">
                  ⚠️ AI can make mistakes. Verify important information independently. Use AI responsibly.
                </div>
                <div className="bg-muted/50 border border-border rounded-lg p-3">
                  📌 Bookmark this website! After your first visit and model download, the app works offline — no server needed.
                </div>
                <div className="border-t border-border pt-3">
                  <p className="font-medium text-foreground text-sm">Built with</p>
                  <p>React 19 · TypeScript · Tailwind CSS · Zustand · WebLLM (MLC AI) · Framer Motion · IndexedDB</p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="font-medium text-foreground">
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
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}