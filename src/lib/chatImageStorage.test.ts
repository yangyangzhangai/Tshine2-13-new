import { describe, expect, it } from 'vitest';
import {
  extractChatImageStoragePathFromUrl,
  resolveChatImageStoragePath,
  resolveLegacyChatImageStoragePath,
} from './chatImageStorage';

describe('resolveChatImageStoragePath', () => {
  it('uses different storage objects for the first and second card images', () => {
    expect(resolveChatImageStoragePath('message-1', 'imageUrl', 'upload-a')).toBe('chat-images/message-1/imageUrl/upload-a.jpg');
    expect(resolveChatImageStoragePath('message-1', 'imageUrl2', 'upload-b')).toBe('chat-images/message-1/imageUrl2/upload-b.jpg');
  });

  it('keeps legacy path resolution for deleting older uploads', () => {
    expect(resolveLegacyChatImageStoragePath('message-1', 'imageUrl')).toBe('message-1.jpg');
    expect(resolveLegacyChatImageStoragePath('message-1', 'imageUrl2')).toBe('message-1-2.jpg');
  });

  it('extracts the storage object path from a public url', () => {
    expect(extractChatImageStoragePathFromUrl(
      'https://example.supabase.co/storage/v1/object/public/seeday-images/user-1/chat-images/message-1/imageUrl/upload-a.jpg?v=123',
    )).toBe('user-1/chat-images/message-1/imageUrl/upload-a.jpg');
  });
});
