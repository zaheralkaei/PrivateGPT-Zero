import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(num);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export function getConversationTitle(messages: { role: string; content: string }[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'New Chat';
  return truncateText(firstUser.content, 40);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAsMarkdown(conversation: { title: string; messages: { role: string; content: string }[] }): string {
  let md = `# ${conversation.title}\n\n`;
  for (const msg of conversation.messages) {
    const label = msg.role === 'user' ? '**You**' : '**AI**';
    md += `${label}:\n\n${msg.content}\n\n---\n\n`;
  }
  return md;
}

export function exportAsJSON(conversation: { id: string; title: string; messages: { role: string; content: string; timestamp: number }[]; model: string }): string {
  return JSON.stringify(conversation, null, 2);
}

export function exportAsText(conversation: { title: string; messages: { role: string; content: string }[] }): string {
  let txt = `${conversation.title}\n${'='.repeat(conversation.title.length)}\n\n`;
  for (const msg of conversation.messages) {
    const label = msg.role === 'user' ? 'You' : 'AI';
    txt += `[${label}]\n${msg.content}\n\n`;
  }
  return txt;
}