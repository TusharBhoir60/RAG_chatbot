import type { SseCitation, SseEvent } from '@/types/rag';

export function parseSseDataLine(line: string): SseEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) {
    return null;
  }
  const payload = trimmed.slice(5).trim();
  if (!payload) {
    return null;
  }
  try {
    const raw: unknown = JSON.parse(payload);
    if (raw === null || typeof raw !== 'object' || !('type' in raw)) {
      return null;
    }
    const event = raw as Record<string, unknown>;
    const type = event.type;
    if (type === 'meta') {
      const citations = Array.isArray(event.citations)
        ? (event.citations as SseCitation[])
        : [];
      return {
        type: 'meta',
        conversation_id: String(event.conversation_id ?? ''),
        citations,
        contexts: Array.isArray(event.contexts) ? event.contexts : [],
      };
    }
    if (type === 'token' && typeof event.content === 'string') {
      return { type: 'token', content: event.content };
    }
    if (type === 'done') {
      return { type: 'done' };
    }
    if (type === 'error' && typeof event.content === 'string') {
      return { type: 'error', content: event.content };
    }
    return null;
  } catch {
    return null;
  }
}
