import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileJson, FileText, File } from 'lucide-react';
import { Button } from '@/components/common/ui';
import { useChatStore } from '@/stores/chat-store';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

// 50 MB cap on imported JSON — anything bigger is almost certainly malformed/malicious
const MAX_IMPORT_BYTES = 50 * 1024 * 1024;

export function ImportDialog({ open, onClose }: ImportDialogProps) {
  const { importConversation } = useChatStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');

    if (file.size > MAX_IMPORT_BYTES) {
      setError(`File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max is ${MAX_IMPORT_BYTES / (1024 * 1024)} MB.`);
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure
      if (!data.messages || !Array.isArray(data.messages)) {
        throw new Error('Invalid conversation format: missing messages array');
      }

      await importConversation(data);
      setSuccess(`Successfully imported "${data.title || 'conversation'}"`);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file');
    }

    e.target.value = '';
  };

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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
          >
            <div className="bg-background rounded-lg border border-border shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Import Conversation</h3>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Import a previously exported conversation (JSON format). The file should contain
                the conversation data with messages and metadata.
              </p>

              <input
                ref={fileRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />

              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 sm:p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Click to select JSON file</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .json export files</p>
              </div>

              {error && (
                <div className="mt-3 text-sm text-destructive bg-destructive/10 rounded-md p-2">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-3 text-sm text-green-400 bg-green-500/10 rounded-md p-2">
                  {success}
                </div>
              )}

              <div className="mt-4 p-3 bg-muted/50 rounded text-xs text-muted-foreground">
                <FileJson className="h-3 w-3 inline mr-1" />
                Conversations can be exported from the sidebar's download button.
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}