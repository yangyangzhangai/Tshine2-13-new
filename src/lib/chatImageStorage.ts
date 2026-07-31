// DOC-DEPS: LLM.md -> docs/PROJECT_MAP.md -> src/features/chat/README.md
export type ChatImageSlot = 'imageUrl' | 'imageUrl2';

function createUploadToken(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function resolveLegacyChatImageStoragePath(messageId: string, slot: ChatImageSlot): string {
  return slot === 'imageUrl' ? `${messageId}.jpg` : `${messageId}-2.jpg`;
}

export function resolveChatImageStoragePath(
  messageId: string,
  slot: ChatImageSlot,
  uploadToken = createUploadToken(),
): string {
  return `chat-images/${messageId}/${slot}/${uploadToken}.jpg`;
}

export function extractChatImageStoragePathFromUrl(url?: string | null): string | null {
  if (!url || url.startsWith('data:')) return null;
  try {
    const parsed = new URL(url);
    const pathSegments = parsed.pathname.split('/').filter(Boolean);
    const bucketIndex = pathSegments.indexOf('seeday-images');
    if (bucketIndex < 0 || bucketIndex >= pathSegments.length - 1) return null;
    return decodeURIComponent(pathSegments.slice(bucketIndex + 1).join('/'));
  } catch {
    return null;
  }
}
