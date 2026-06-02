import React from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Download, RotateCcw, User, Bot, Clock, Zap, ImageIcon, ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Button, Badge } from '@/components/common/ui';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
}

/** Extract <think>...</think> blocks from model output.
 *  Returns { thinking: string | null, content: string }
 */
function parseThinkingContent(raw: string): { thinking: string | null; content: string } {
  // Match <think>...</think> blocks (including multiline)
  const thinkMatch = raw.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    const thinking = thinkMatch[1].trim();
    const content = raw.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    return { thinking: thinking || null, content: content || '(empty response)' };
  }

  // Handle unclosed <think> during streaming — everything after <think> is thinking
  const openThink = raw.indexOf('<think>');
  if (openThink !== -1) {
    const thinking = raw.slice(openThink + 7).trim();
    const content = raw.slice(0, openThink).trim();
    // If we're still streaming, thinking is in progress
    return { thinking: thinking || null, content: content || '' };
  }

  return { thinking: null, content: raw };
}

function ThinkingBlock({ thinking, isStreaming }: { thinking: string; isStreaming?: boolean }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground active:text-foreground transition-colors min-h-[44px] py-1.5"
      >
        <Brain className="h-3 w-3 text-muted-foreground" />
        <span className="italic">{isStreaming ? 'Thinking...' : 'Thought process'}</span>
        <span className="text-[10px] text-muted-foreground/60">
          ({thinking.length} chars)
        </span>
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {expanded && (
        <div className="mt-1.5 pl-4 border-l-2 border-muted-foreground/20 text-xs text-muted-foreground/80 whitespace-pre-wrap leading-relaxed">
          {thinking}
        </div>
      )}
    </div>
  );
}

export function MessageBubble({ message, isStreaming, onRegenerate }: MessageBubbleProps) {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === 'user';
  const { thinking, content } = isUser ? { thinking: null, content: message.content } : parseThinkingContent(message.content);

  const handleCopy = () => {
    const textToCopy = thinking ? '[Thinking]\n' + thinking + '\n\n[Response]\n' + content : content;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(textToCopy);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex gap-3 px-4 py-3 group', isUser ? '' : 'bg-muted/30')}
    >
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{isUser ? 'You' : 'PrivateGPT Zero'}</span>
          {message.model && !isUser && (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
              {message.model}
            </Badge>
          )}
          {message.tokens && !isUser && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Zap className="h-2.5 w-2.5" />
              {message.tokens} tokens
            </span>
          )}
          {message.durationMs && !isUser && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {(message.durationMs / 1000).toFixed(1)}s
            </span>
          )}
          {message.imageData && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
              <ImageIcon className="h-2.5 w-2.5 mr-0.5" /> Image
            </Badge>
          )}
        </div>

        {/* Show image preview if present */}
        {message.imageData && (
          <div className="mb-2">
            <img
              src={message.imageData}
              alt="Uploaded"
              className="max-w-[200px] sm:max-w-xs max-h-48 rounded-lg border border-border"
            />
          </div>
        )}

        <div className={isUser ? 'whitespace-pre-wrap text-sm' : ''}>
          {isUser ? (
            <p className="text-sm leading-relaxed break-words">{message.content}</p>
          ) : (
            <div className={cn(isStreaming && 'typing-cursor')}>
              {thinking && <ThinkingBlock thinking={thinking} isStreaming={isStreaming} />}
              {content && <MarkdownRenderer content={content} />}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 mt-2 opacity-60 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-9 sm:h-7 min-w-[44px] sm:min-w-0 px-2 text-xs">
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          {!isUser && onRegenerate && (
            <Button variant="ghost" size="sm" onClick={onRegenerate} className="h-9 sm:h-7 min-w-[44px] sm:min-w-0 px-2 text-xs">
              <RotateCcw className="h-3 w-3 mr-1" /> Retry
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Streaming message bubble — shows content as it's generated
export function StreamingMessage({ content }: { content: string }) {
  const { thinking, content: responseContent } = parseThinkingContent(content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 px-4 py-3 bg-muted/30"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-gradient-to-br from-violet-500 to-purple-600 text-white">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">PrivateGPT Zero</span>
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 animate-pulse">
            {thinking && !responseContent ? 'Thinking...' : 'Generating...'}
          </Badge>
        </div>
        <div className="typing-cursor">
          {thinking && <ThinkingBlock thinking={thinking} isStreaming={true} />}
          {responseContent && <MarkdownRenderer content={responseContent} />}
        </div>
      </div>
    </motion.div>
  );
}