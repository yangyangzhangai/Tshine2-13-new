// DOC-DEPS: LLM.md -> api/README.md -> src/server/account-deletion-data.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  deleteStorageObjects,
  deleteUserRows,
  USER_SCOPED_TABLES,
} from './account-deletion-data';

function makeStorageClient(options?: { listError?: Error; removeError?: Error }) {
  const remove = vi.fn(async () => ({ error: options?.removeError ?? null }));
  const list = vi.fn(async (prefix: string) => {
    if (options?.listError) return { data: null, error: options.listError };
    if (prefix === 'user-1') {
      return {
        data: [
          { id: null, name: 'avatars' },
          { id: 'root-file-id', name: 'root.jpg' },
        ],
        error: null,
      };
    }
    if (prefix === 'user-1/avatars') {
      return { data: [{ id: 'avatar-id', name: 'profile.jpg' }], error: null };
    }
    return { data: [], error: null };
  });
  const client = {
    storage: {
      from: vi.fn(() => ({ list, remove })),
    },
  } as unknown as SupabaseClient;
  return { client, list, remove };
}

describe('account deletion data cleanup', () => {
  it('recursively removes every object under the user storage prefix', async () => {
    const { client, remove } = makeStorageClient();
    await deleteStorageObjects(client, 'user-1');
    expect(remove).toHaveBeenCalledWith([
      'user-1/avatars/profile.jpg',
      'user-1/root.jpg',
    ]);
  });

  it('fails closed when storage listing or removal fails', async () => {
    const listFailure = makeStorageClient({ listError: new Error('list failed') });
    await expect(deleteStorageObjects(listFailure.client, 'user-1'))
      .rejects.toThrow('storage_list_failed:user-1:list failed');

    const removeFailure = makeStorageClient({ removeError: new Error('remove failed') });
    await expect(deleteStorageObjects(removeFailure.client, 'user-1'))
      .rejects.toThrow('storage_remove_failed:remove failed');
  });

  it('covers all known user tables and interrupts on the first failed delete', async () => {
    const visited: string[] = [];
    const client = {
      from: vi.fn((table: string) => ({
        delete: () => ({
          eq: async () => {
            visited.push(table);
            return {
              error: table === 'telemetry_events' ? new Error('delete denied') : null,
            };
          },
        }),
      })),
    } as unknown as SupabaseClient;

    await expect(deleteUserRows(client, 'user-1'))
      .rejects.toThrow('delete_failed:telemetry_events:delete denied');
    expect(visited).toEqual(
      USER_SCOPED_TABLES.slice(0, USER_SCOPED_TABLES.indexOf('telemetry_events') + 1),
    );
    expect(visited).toContain('live_input_events');
    expect(visited).toContain('plant_asset_events');
    expect(visited).not.toContain('user_feedback');
  });
});
