import { describe, expect, it, vi } from 'vitest';

import {
  installChatStoreIntegrationTestHarness,
  testGetSupabaseSession,
  testResetChatStore,
  testSupabase,
  testUseChatStore,
  testUseMoodStore,
} from './useChatStore.integration.test.helpers';
import { getLocalDateString } from './chatHelpers';
import { getLiveInputTelemetrySnapshot } from '../services/input/liveInputTelemetry';

const getSupabaseSession = testGetSupabaseSession;
const resetChatStore = testResetChatStore;
const supabase = testSupabase;
const useChatStore = testUseChatStore;
const useMoodStore = testUseMoodStore;

describe('useChatStore integration: reclassify and mood stability flow', () => {
  installChatStoreIntegrationTestHarness();

  it('reclassifies latest mood <-> activity with minimal timeline repair', async () => {
    const base = 1_700_000_000_000;
    const dateKey = getLocalDateString(new Date(base));
    resetChatStore([
      {
        id: 'activity-1',
        content: '写周报',
        timestamp: base,
        type: 'text',
        mode: 'record',
        activityType: 'life',
        duration: undefined,
      },
      {
        id: 'mood-1',
        content: '好烦',
        timestamp: base + 10 * 60 * 1000,
        type: 'text',
        mode: 'record',
        activityType: 'mood',
        isMood: true,
      },
    ]);
    useChatStore.setState({
      dateCache: {
        [dateKey]: [...useChatStore.getState().messages],
      },
      activeViewDateStr: dateKey,
    });

    useMoodStore.setState({
      ...useMoodStore.getState(),
      moodNote: { 'activity-1': '好烦' },
      moodNoteMeta: {
        'activity-1': { source: 'auto', linkedMoodMessageId: 'mood-1' },
      },
    });

    await useChatStore.getState().reclassifyRecentInput('mood-1', 'activity');

    let messages = useChatStore.getState().messages;
    expect(messages.find((message) => message.id === 'mood-1')?.isMood).toBe(false);
    expect(messages.find((message) => message.id === 'mood-1')?.isActive).toBe(true);
    expect(messages.find((message) => message.id === 'activity-1')?.duration).toBe(10);
    expect(messages.find((message) => message.id === 'activity-1')?.isActive).toBe(false);
    expect(useMoodStore.getState().moodNote['activity-1']).toBeUndefined();
    expect(useMoodStore.getState().moodNoteMeta['activity-1']).toBeUndefined();

    await useChatStore.getState().reclassifyRecentInput('mood-1', 'mood');

    messages = useChatStore.getState().messages;
    expect(messages.find((message) => message.id === 'mood-1')?.isMood).toBe(true);
    expect(messages.find((message) => message.id === 'mood-1')?.isActive).toBe(false);
    expect(messages.find((message) => message.id === 'activity-1')?.duration).toBeUndefined();
    expect(messages.find((message) => message.id === 'activity-1')?.isActive).toBe(true);
    expect(useMoodStore.getState().moodNote['activity-1']).toBe('好烦');

    const telemetry = getLiveInputTelemetrySnapshot();
    expect(telemetry.correctionByPath['mood->activity']).toBe(1);
    expect(telemetry.correctionByPath['activity->mood']).toBe(1);
  });

  it('persists reclassify active and detached flags', async () => {
    const base = 1_700_000_000_000;
    const updateChain = { eq: vi.fn().mockReturnThis() };
    const updateSpy = vi.fn().mockReturnValue(updateChain);
    const upsertSpy = vi.fn(async () => ({ error: null }));
    const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({
      update: updateSpy,
      upsert: upsertSpy,
    } as never);
    vi.mocked(getSupabaseSession).mockResolvedValue({ user: { id: 'user-1' } } as never);

    resetChatStore([
      {
        id: 'activity-1',
        content: '写周报',
        timestamp: base,
        type: 'text',
        mode: 'record',
        activityType: 'life',
        duration: 10,
        isActive: false,
      },
      {
        id: 'activity-2',
        content: '好烦',
        timestamp: base + 10 * 60 * 1000,
        type: 'text',
        mode: 'record',
        activityType: 'life',
        duration: undefined,
        isActive: true,
      },
    ]);

    await useChatStore.getState().reclassifyRecentInput('activity-2', 'mood');

    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
      is_mood: true,
      activity_type: 'mood',
      duration: null,
      is_active: false,
      detached: true,
    }));
    expect(updateSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({
      is_mood: false,
      duration: null,
      is_active: true,
      detached: false,
    }));

    fromSpy.mockRestore();
    vi.mocked(getSupabaseSession).mockResolvedValue(null as never);
  });

  it('allows converting detached mood card even when it is not the latest record message', async () => {
    const base = 1_700_000_000_000;
    resetChatStore([
      {
        id: 'mood-old',
        content: '有点烦',
        timestamp: base,
        type: 'text',
        mode: 'record',
        activityType: 'mood',
        isMood: true,
        detached: true,
      },
      {
        id: 'activity-latest',
        content: '写代码',
        timestamp: base + 10 * 60 * 1000,
        type: 'text',
        mode: 'record',
        activityType: 'work',
        duration: undefined,
      },
    ]);

    await useChatStore.getState().convertMoodToEvent('mood-old');

    const messages = useChatStore.getState().messages;
    expect(messages.find((message) => message.id === 'mood-old')?.isMood).toBe(false);
    expect(messages.find((message) => message.id === 'mood-old')?.activityType).not.toBe('mood');
    expect(messages.find((message) => message.id === 'mood-old')?.duration).toBe(0);
    expect(messages.find((message) => message.id === 'activity-latest')?.isMood).toBeUndefined();
  });

  it('auto-assigns mood label after converting latest mood card to event', async () => {
    const base = 1_700_000_000_000;
    resetChatStore([
      {
        id: 'activity-old',
        content: '开会',
        timestamp: base,
        type: 'text',
        mode: 'record',
        activityType: 'work',
        duration: undefined,
      },
      {
        id: 'mood-latest',
        content: '整理文档',
        timestamp: base + 10 * 60 * 1000,
        type: 'text',
        mode: 'record',
        activityType: 'mood',
        isMood: true,
        detached: true,
      },
    ]);

    await useChatStore.getState().convertMoodToEvent('mood-latest');

    const messages = useChatStore.getState().messages;
    expect(messages.find((message) => message.id === 'mood-latest')?.isMood).toBe(false);
    expect(useMoodStore.getState().activityMood['mood-latest']).toBeDefined();
  });

  it('re-sorts timeline items when a detached mood card time is edited', async () => {
    const base = 1_700_000_000_000;
    resetChatStore([
      {
        id: 'event-1',
        content: '阅读',
        timestamp: base,
        type: 'text',
        mode: 'record',
        activityType: 'life',
        duration: 20,
      },
      {
        id: 'mood-detached',
        content: '有点累',
        timestamp: base + 30 * 60 * 1000,
        type: 'text',
        mode: 'record',
        activityType: 'mood',
        isMood: true,
        detached: true,
      },
    ]);

    await useChatStore.getState().updateActivity(
      'mood-detached',
      '有点累',
      base - 5 * 60 * 1000,
      base - 5 * 60 * 1000,
    );

    const ordered = useChatStore.getState().messages.map((message) => message.id);
    expect(ordered[0]).toBe('mood-detached');
    expect(ordered[1]).toBe('event-1');
  });

  it('assigns auto mood when detaching mood description into a mood card', async () => {
    const base = 1_700_000_000_000;
    resetChatStore([
      {
        id: 'event-1',
        content: '开会',
        timestamp: base,
        type: 'text',
        mode: 'record',
        activityType: 'work',
        duration: undefined,
        moodDescriptions: [
          {
            id: 'mood-1',
            content: '有点烦',
            timestamp: base + 10 * 60 * 1000,
          },
        ],
      },
      {
        id: 'mood-1',
        content: '有点烦',
        timestamp: base + 10 * 60 * 1000,
        type: 'text',
        mode: 'record',
        activityType: 'mood',
        isMood: true,
        detached: false,
      },
    ]);

    useChatStore.getState().detachMoodFromEvent('event-1', 'mood-1');

    const messages = useChatStore.getState().messages;
    expect(messages.find((message) => message.id === 'mood-1')?.detached).toBe(true);
    expect(useMoodStore.getState().activityMood['mood-1']).toBeDefined();
  });

  it('assigns auto mood for inserted activity card immediately', async () => {
    const base = 1_700_000_000_000;
    resetChatStore([
      {
        id: 'event-1',
        content: '学习',
        timestamp: base,
        type: 'text',
        mode: 'record',
        activityType: 'life',
        duration: 60,
      },
    ]);

    await useChatStore.getState().insertActivity(
      'event-1',
      null,
      '跑步',
      base + 70 * 60 * 1000,
      base + 100 * 60 * 1000,
    );

    const inserted = useChatStore.getState().messages.find((message) => message.content === '跑步');
    expect(inserted).toBeDefined();
    expect(useMoodStore.getState().activityMood[inserted!.id]).toBeDefined();
  });

  it('keeps the first mood label stable when later auto detection runs again', async () => {
    useMoodStore.getState().setMood('activity-stable', 'happy', 'auto');
    useMoodStore.getState().setMood('activity-stable', 'calm', 'auto');

    let moodState = useMoodStore.getState();
    expect(moodState.activityMood['activity-stable']).toBe('happy');
    expect(moodState.activityMoodMeta['activity-stable']?.source).toBe('auto');

    useMoodStore.getState().setMood('activity-stable', 'calm', 'manual');

    moodState = useMoodStore.getState();
    expect(moodState.activityMood['activity-stable']).toBe('calm');
    expect(moodState.activityMoodMeta['activity-stable']?.source).toBe('manual');
  });

  it('does not recompute edited activity mood after the first auto label is set', async () => {
    const base = 1_700_000_000_000;
    resetChatStore([
      {
        id: 'activity-auto',
        content: '开会',
        timestamp: base,
        type: 'text',
        mode: 'record',
        activityType: 'life',
        duration: 10,
      },
      {
        id: 'activity-manual',
        content: '学习',
        timestamp: base + 20 * 60 * 1000,
        type: 'text',
        mode: 'record',
        activityType: 'life',
        duration: 10,
      },
    ]);

    useMoodStore.setState({
      ...useMoodStore.getState(),
      activityMood: {
        'activity-auto': 'down',
        'activity-manual': 'happy',
      },
      activityMoodMeta: {
        'activity-auto': { source: 'auto' },
        'activity-manual': { source: 'manual' },
      },
    });

    await useChatStore.getState().updateActivity('activity-auto', '跑步', base, base + 10 * 60 * 1000);
    await useChatStore.getState().updateActivity(
      'activity-manual',
      '跑步',
      base + 20 * 60 * 1000,
      base + 30 * 60 * 1000,
    );

    const moodState = useMoodStore.getState();
    expect(moodState.activityMood['activity-auto']).toBe('down');
    expect(moodState.activityMoodMeta['activity-auto']?.source).toBe('auto');
    expect(moodState.activityMood['activity-manual']).toBe('happy');
    expect(moodState.activityMoodMeta['activity-manual']?.source).toBe('manual');
  });
});
