// DOC-DEPS: LLM.md -> api/README.md -> docs/SUPABASE_PERSISTENCE_INVENTORY.md
import type { SupabaseClient } from '@supabase/supabase-js';

export const ACCOUNT_STORAGE_BUCKET = 'seeday-images';
const STORAGE_PAGE_SIZE = 100;

export const USER_SCOPED_TABLES = [
  'moods',
  'messages',
  'todos',
  'bottles',
  'focus_sessions',
  'timing_sessions',
  'reports',
  'annotations',
  'stardust_memories',
  'daily_plant_records',
  'plant_direction_config',
  'user_stats',
  'live_input_events',
  'plant_asset_events',
  'telemetry_events',
  'user_feedback',
  'reminder_responses',
  'user_login_days',
  'user_profiles',
  'user_account_state',
] as const;

export async function deleteUserRows(
  adminClient: SupabaseClient,
  userId: string,
): Promise<void> {
  for (const table of USER_SCOPED_TABLES) {
    const { error } = await adminClient.from(table).delete().eq('user_id', userId);
    if (error) throw new Error(`delete_failed:${table}:${error.message}`);
  }
}

async function listStoragePage(
  adminClient: SupabaseClient,
  prefix: string,
  offset: number,
) {
  const result = await adminClient.storage.from(ACCOUNT_STORAGE_BUCKET).list(prefix, {
    limit: STORAGE_PAGE_SIZE,
    offset,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (result.error) throw new Error(`storage_list_failed:${prefix}:${result.error.message}`);
  return result.data ?? [];
}

export async function listStoragePaths(
  adminClient: SupabaseClient,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  while (true) {
    const entries = await listStoragePage(adminClient, prefix, offset);
    for (const entry of entries) {
      if (!entry.name) continue;
      const fullPath = `${prefix}/${entry.name}`;
      if (entry.id) paths.push(fullPath);
      else paths.push(...await listStoragePaths(adminClient, fullPath));
    }
    if (entries.length < STORAGE_PAGE_SIZE) break;
    offset += entries.length;
  }
  return paths;
}

export async function deleteStorageObjects(
  adminClient: SupabaseClient,
  userId: string,
): Promise<void> {
  const paths = await listStoragePaths(adminClient, userId);
  for (let index = 0; index < paths.length; index += STORAGE_PAGE_SIZE) {
    const batch = paths.slice(index, index + STORAGE_PAGE_SIZE);
    const { error } = await adminClient.storage.from(ACCOUNT_STORAGE_BUCKET).remove(batch);
    if (error) throw new Error(`storage_remove_failed:${error.message}`);
  }
}
