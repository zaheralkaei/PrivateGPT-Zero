import React, { useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Paperclip,
  ImagePlus,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, AutoResizeTextarea } from '@/components/common/ui';
import { useModelStore } from '@/stores/model-store';

interface ChatInputProps {
  onSend: (content: string, imageData?: { dataUrl: string; mimeType: string }) => void;
  onStop: () => void;
  onFileUpload: (files: FileList) => void;
  isGenerating: boolean;
  disabled?: boolean;
  hasVisionSupport?: boolean;
}

export function ChatInput({ onSend, onStop, onFileUpload, isGenerating, disabled, hasVisionSupport }: ChatInputProps) {
  const [input, setInput] = React.useState('');
  const [pendingImage, setPendingImage] = React.useState<{ dataUrl: string; name: string; mimeType: string } | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { loadState } = useModelStore();

  const modelReady = loadState.status === 'ready';

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed && !pendingImage) return;
    if (!modelReady) return;

    if (pendingImage) {
      onSend(trimmed || 'Describe this image.', { dataUrl: pendingImage.dataUrl, mimeType: pendingImage.mimeType });
      setPendingImage(null);
    } else {
      onSend(trimmed);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read image as base64 data URL
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage({
        dataUrl: reader.result as string,
        name: file.name,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      className="border-t border-border bg-background p-3 md:p-4"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="max-w-3xl mx-auto">
        {!modelReady && loadState.status !== 'idle' && (
          <div className="mb-2 text-center text-xs text-muted-foreground py-1.5 bg-muted/50 rounded-md">
            {loadState.status === 'loading'
              ? `Loading model... ${Math.round(loadState.progress * 100)}% — ${loadState.progressText}`
              : `Error: ${loadState.error}`}
          </div>
        )}

        {/* Pending image preview */}
        {pendingImage && (
          <div className="mb-2 flex items-center gap-2 bg-muted/50 rounded-lg p-2">
            <img
              src={pendingImage.dataUrl}
              alt={pendingImage.name}
              className="h-12 w-12 rounded object-cover"
            />
            <div className="flex-1 text-xs text-muted-foreground">
              <span className="font-medium">{pendingImage.name}</span>
              <br />
              <span>Image will be sent with your message</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPendingImage(null)}
              className="h-11 w-11 sm:h-6 sm:w-6"
            >
              <X className="h-4 w-4 sm:h-3 sm:w-3" />
            </Button>
          </div>
        )}

        <div className="flex items-end gap-1 sm:gap-2">
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.txt,.md,.json,.docx,.doc,.csv,.html,.htm"
            onChange={(e) => {
              if (e.target.files) onFileUpload(e.target.files);
              e.target.value = '';
            }}
          />
          <input
            ref={imageInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleImageSelect}
          />

          {/* File attach button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            title="Attach document (PDF, DOCX, TXT, MD)"
            disabled={disabled}
            className="shrink-0 h-10 w-10 sm:h-8 sm:w-8"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Image button — only enabled for vision models */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => imageInputRef.current?.click()}
            title={hasVisionSupport ? 'Upload image for analysis' : 'Image analysis requires a vision model (🔍)'}
            disabled={disabled || !hasVisionSupport}
            className={cn('shrink-0 h-10 w-10 sm:h-8 sm:w-8', !hasVisionSupport ? 'opacity-40' : '')}
          >
            <ImagePlus className="h-4 w-4" />
          </Button>

          {/* Text input */}
          <div className="flex-1 relative">
            <AutoResizeTextarea
              ref={textRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !modelReady
                  ? 'Load a model to start chatting...'
                  : hasVisionSupport
                    ? 'Type a message or upload an image... (Enter to send)'
                    : 'Type a message... (Enter to send, Shift+Enter for new line)'
              }
              disabled={disabled || !modelReady}
              maxRows={8}
              className="pr-12"
            />
            <div className="absolute right-2 bottom-2">
              {isGenerating ? (
                <Button variant="ghost" size="icon" onClick={onStop} className="h-10 w-10 sm:h-8 sm:w-8 text-destructive">
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSubmit}
                  disabled={(!input.trim() && !pendingImage) || !modelReady}
                  className={cn('h-10 w-10 sm:h-8 sm:w-8', (input.trim() || pendingImage) && modelReady ? 'text-primary' : 'text-muted-foreground')}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center mt-1.5 text-[11px] sm:text-[10px] text-muted-foreground">
          <Sparkles className="h-3 w-3 mr-1" />
          PrivateGPT Zero — AI runs locally on your device. No data sent to servers.
        </div>
      </div>
    </div>
  );
}