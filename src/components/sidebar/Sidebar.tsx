import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Trash2, X, Download, Upload, Shield, ChevronLeft, FileDown } from 'lucide-react';
import { cn, exportAsJSON, exportAsMarkdown, exportAsText, downloadFile } from '@/lib/utils';
import { Button, ScrollArea, Separator, Badge } from '@/components/common/ui';
import { useChatStore } from '@/stores/chat-store';
import type { Conversation } from '@/types';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onOpenPrivacy: () => void;
  onImport: () => void;
}

export function Sidebar({ open, onClose, onNewChat, onOpenSettings, onOpenPrivacy, onImport }: SidebarProps) {
  const { conversations, activeConversationId, setActiveConversation, deleteConversation, clearAllConversations } =
    useChatStore();

  const [exportMenuConv, setExportMenuConv] = React.useState<string | null>(null);

  // Click-outside handler to close export dropdown
  useEffect(() => {
    if (!exportMenuConv) return;
    const handleClickOutside = () => setExportMenuConv(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [exportMenuConv]);

  const handleExportJSON = (conv: Conversation) => {
    const json = exportAsJSON(conv);
    downloadFile(json, conv.title.replace(/[^a-z0-9]/gi, '_') + '.json', 'application/json');
    setExportMenuConv(null);
  };

  const handleExportMD = (conv: Conversation) => {
    const md = exportAsMarkdown(conv);
    downloadFile(md, conv.title.replace(/[^a-z0-9]/gi, '_') + '.md', 'text/markdown');
    setExportMenuConv(null);
  };

  const handleExportTXT = (conv: Conversation) => {
    const txt = exportAsText(conv);
    downloadFile(txt, conv.title.replace(/[^a-z0-9]/gi, '_') + '.txt', 'text/plain');
    setExportMenuConv(null);
  };

  const handleClearAll = async () => {
    if (window.confirm('Delete all conversations? This cannot be undone.')) {
      await clearAllConversations();
    }
  };

  return (
    <>
      {/* Backdrop on mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        initial={false}
        animate={{ width: open ? 280 : 0, opacity: open ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'fixed lg:relative z-50 h-full flex flex-col bg-sidebar-bg border-r border-border overflow-hidden',
          'lg:translate-x-0 lg:!w-[280px] lg:!opacity-100',
        )}
      >
        <div className="flex items-center justify-between p-3">
          <h2 className="font-semibold text-sm text-foreground">Chats</h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onNewChat} title="New chat (Ctrl+Shift+N)">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 pb-4">
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                aria-label={conv.title}
                className={cn(
                  'group relative flex items-center gap-2 rounded-md px-3 py-3 sm:py-2 text-sm cursor-pointer transition-colors',
                  conv.id === activeConversationId
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground/70 hover:bg-accent/50 hover:text-foreground',
                )}
                onClick={() => setActiveConversation(conv.id)}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1">{conv.title}</span>

                {/* Export dropdown + delete — always reachable; on desktop they fade in on row hover, on mobile they show only on row hover (avoiding accidental taps) */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExportMenuConv(exportMenuConv === conv.id ? null : conv.id);
                      }}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-accent"
                      title="Export"
                    >
                      <FileDown className="h-4 w-4" />
                    </button>
                    {exportMenuConv === conv.id && (
                      <div className="absolute right-0 top-10 z-10 bg-background border border-border rounded shadow-md py-1 min-w-[140px]">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleExportJSON(conv); }}
                          className="block w-full text-left px-3 py-2.5 text-xs hover:bg-accent"
                        >
                          Export JSON
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleExportMD(conv); }}
                          className="block w-full text-left px-3 py-2.5 text-xs hover:bg-accent"
                        >
                          Export Markdown
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleExportTXT(conv); }}
                          className="block w-full text-left px-3 py-2.5 text-xs hover:bg-accent"
                        >
                          Export Text
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-destructive/20 text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        <div className="p-3 space-y-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 h-11 sm:h-9" onClick={onImport}>
              <Upload className="h-3 w-3 mr-1" /> Import
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-11 sm:h-9" onClick={handleClearAll}>
              <Trash2 className="h-3 w-3 mr-1" /> Clear All
            </Button>
          </div>

          <Button variant="ghost" size="sm" className="w-full justify-start h-11 sm:h-9" onClick={onOpenPrivacy}>
            <Shield className="h-3 w-3 mr-2" /> Privacy Info
          </Button>
        </div>
      </motion.aside>
    </>
  );
}