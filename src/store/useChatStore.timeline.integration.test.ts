import { describe, expect, it, vi } from 'vitest';

import {
  installChatStoreIntegrationTestHarness,
  Message,
  testGetSupabaseSession,
  testResetChatStore,
  testSupabase,
  testUseChatStore,
} from './useChatStore.integration.test.helpers';
import { getLocalDateString } from './chatHelpers';

const getSupabaseSession = testGetSupabaseSession;
const resetChatStore = testResetChatStore;
const supabase = testSupabase;
const useChatStore = testUseChatStore;

describe('useChatStore integration: timeline edit and manual-end flow', () => {
  installChatStoreIntegrationTestHarness();

  it('blocks inserted activities that overlap an ongoing activity', async () => {
    const base = 1_700_000_000_000;
    resetChatStore([
      {
        id: 'activity-ongoing',
        content: '写周报',
        timestamp: base,
        type: 'text',
        mode: 'record',
        activityType: 'work',
        duration: undefined,
        isActive: true,
      },
    ]);

    await expect(
      useChatStore.getState().insertActivity(null, null, '喝咖啡', base + 5 * 60 * 1000, base + 15 * 60 * 1000),
    ).rejects.toMatchObject({ message: 'overlap_with_ongoing_activity', activityContent: '写周报' });
    expect(useChatStore.getState().messages).toHaveLength(1);
  });

  it('blocks activity edits that would overlap an ongoing activity', async () => {
    const base = 1_700_000_000_000;
    resetChatStore([
      {
        id: 'activity-ongoing',
        content: '写周报',
        timestamp: base,
        type: 'text',
        mode: 'record',
        activityType: 'work',
        duration: undefined,
        isActive: true,
      },
      {
        id: 'activity-ended',
        content: '吃饭',
        timestamp: base - 60 * 60 * 1000,
        type: 'text',
        mode: 'record',
        activityType: 'life',
        duration: 20,
      },
    ]);

    await expect(
      useChatStore.getState().updateActivity('activity-ended', '吃饭', base - 10 * 60 * 1000, base + 5 * 60 * 1000),
    ).rejects.toMatchObject({ message: 'overlap_with_ongoing_activity', activityContent: '写周报' });
    expect(useChatStore.getState().messages.find((message) => message.id === 'activity-ended')?.duration).toBe(20);
  });

  it('keeps an edited ongoing activity open when only the start time changes', async () => {
    const base = 1_700_000_000_000;
    const dateKey = getLocalDateString(new Date(base));
    const activity: Message = {
      id: 'activity-ongoing-edit-start',
      content: '写方案',
      timestamp: base,
      type: 'text',
      mode: 'record',
      activityType: 'work',
      duration: undefined,
      isActive: true,
    };
    resetChatStore([activity]);
    useChatStore.setState({ dateCache: { [dateKey]: [activity] }, activeViewDateStr: dateKey });

    await useChatStore.getState().updateActivity(
      activity.id,
      '写方案',
      base - 5 * 60 * 1000,
      base,
      { keepOngoing: true },
    );

    let state = useChatStore.getState();
    expect(state.messages[0].timestamp).toBe(base - 5 * 60 * 1000);
    expect(state.messages[0].duration).toBeUndefined();
    expect(state.messages[0].isActive).toBe(true);
    expect(state.dateCache[dateKey][0].timestamp).toBe(base - 5 * 60 * 1000);
    expect(state.dateCache[dateKey][0].duration).toBeUndefined();
    expect(state.dateCache[dateKey][0].isActive).toBe(true);

    await useChatStore.getState().sendMessage('散步', base + 30 * 60 * 1000);

    state = useChatStore.getState();
    const edited = state.messages.find((message) => message.id === activity.id);
    expect(edited?.duration).toBe(35);
    expect(edited?.isActive).toBe(false);
  });

  it('keeps a manually ended activity closed when the next activity is added', async () => {
    const base = 1_700_000_000_000;
    const dateKey = getLocalDateString(new Date(base));
    const activity: Message = {
      id: 'activity-manual-ended',
      content: '写方案',
      timestamp: base,
      type: 'text',
      mode: 'record',
      activityType: 'work',
      duration: undefined,
      isActive: true,
    };
    resetChatStore([activity]);
    useChatStore.setState({ dateCache: { [dateKey]: [activity] }, activeViewDateStr: dateKey });

    await useChatStore.getState().updateActivity(
      activity.id,
      '写方案',
      base - 5 * 60 * 1000,
      base + 10 * 60 * 1000,
    );

    let state = useChatStore.getState();
    expect(state.messages[0].duration).toBe(15);
    expect(state.messages[0].isActive).toBe(false);
    expect(state.dateCache[dateKey][0].duration).toBe(15);
    expect(state.dateCache[dateKey][0].isActive).toBe(false);

    await useChatStore.getState().sendMessage('散步', base + 30 * 60 * 1000);

    state = useChatStore.getState();
    const edited = state.messages.find((message) => message.id === activity.id);
    expect(edited?.duration).toBe(15);
    expect(edited?.isActive).toBe(false);
  });

  it('persists closed state when manually ending an ongoing activity via edit', async () => {
    const base = 1_700_000_000_000;
    const updateChain = { eq: vi.fn().mockReturnThis() };
    const updateSpy = vi.fn().mockReturnValue(updateChain);
    const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({ update: updateSpy } as never);
    vi.mocked(getSupabaseSession).mockResolvedValue({ user: { id: 'user-1' } } as never);

    resetChatStore([
      {
        id: 'activity-persist-end',
        content: '写方案',
        timestamp: base,
        type: 'text',
        mode: 'record',
        activityType: 'work',
        duration: undefined,
        isActive: true,
      },
    ]);

    await useChatStore.getState().updateActivity(
      'activity-persist-end',
      '写方案',
      base,
      base + 10 * 60 * 1000,
    );

    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      duration: 10,
      is_active: false,
    }));

    fromSpy.mockRestore();
    vi.mocked(getSupabaseSession).mockResolvedValue(null as never);
  });

  it('keeps activity active during the 3-second manual-end undo window', async () => {
    const startedAt = 1_700_000_000_000;
    const endedAt = startedAt + 12 * 60 * 1000;
    const dateKey = getLocalDateString(new Date(startedAt));
    const activity: Message = {
      id: 'activity-manual-end',
      content: '写方案',
      timestamp: startedAt,
      type: 'text',
      mode: 'record',
      activityType: 'work',
      isActive: true,
      duration: undefined,
    };
    resetChatStore([activity]);
    useChatStore.setState({ dateCache: { [dateKey]: [activity] }, activeViewDateStr: dateKey });
    vi.useFakeTimers();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(endedAt);

    useChatStore.getState().requestManualEndActivity(activity.id);

    let state = useChatStore.getState();
    expect(state.pendingManualEnds[activity.id]).toBe(endedAt + 3_000);
    expect(state.messages[0].duration).toBeUndefined();
    expect(state.messages[0].isActive).toBe(true);
    expect(state.dateCache[dateKey][0].duration).toBeUndefined();
    expect(state.dateCache[dateKey][0].isActive).toBe(true);

    await vi.advanceTimersByTimeAsync(3_000);

    nowSpy.mockRestore();
    state = useChatStore.getState();
    expect(state.messages[0].duration).toBe(12);
    expect(state.messages[0].isActive).toBe(false);
    expect(state.pendingManualEnds[activity.id]).toBeUndefined();
    expect(state.dateCache[dateKey][0].duration).toBe(12);
    expect(state.dateCache[dateKey][0].isActive).toBe(false);
  });

  it('restores the activity when manual end is cancelled within 3 seconds', async () => {
    const startedAt = 1_700_000_000_000;
    const dateKey = getLocalDateString(new Date(startedAt));
    const activity: Message = {
      id: 'activity-manual-end-cancel',
      content: '写方案',
      timestamp: startedAt,
      type: 'text',
      mode: 'record',
      activityType: 'work',
      isActive: true,
      duration: undefined,
    };
    resetChatStore([activity]);
    useChatStore.setState({ dateCache: { [dateKey]: [activity] }, activeViewDateStr: dateKey });
    vi.useFakeTimers();

    useChatStore.getState().requestManualEndActivity(activity.id);
    useChatStore.getState().cancelManualEndActivity(activity.id);
    await vi.advanceTimersByTimeAsync(3_000);

    const state = useChatStore.getState();
    expect(state.pendingManualEnds[activity.id]).toBeUndefined();
    expect(state.messages[0].duration).toBeUndefined();
    expect(state.messages[0].isActive).toBe(true);
    expect(state.dateCache[dateKey][0].duration).toBeUndefined();
    expect(state.dateCache[dateKey][0].isActive).toBe(true);
  });
});
