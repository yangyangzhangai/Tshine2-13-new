import { describe, expect, it, vi } from 'vitest';

import {
  installChatStoreIntegrationTestHarness,
  Message,
  testGetSupabaseSession,
  testResetChatStore,
  testSupabase,
  testUseChatStore,
  testUseMoodStore,
} from './useChatStore.integration.test.helpers';
import { getLocalDateString } from './chatHelpers';

const resetChatStore = testResetChatStore;
const supabase = testSupabase;
const useChatStore = testUseChatStore;
const useMoodStore = testUseMoodStore;
const getSupabaseSession = testGetSupabaseSession;

describe('useChatStore integration: auto recognition and correction flow', () => {
  installChatStoreIntegrationTestHarness();

  it('routes mixed evidence as new_activity and keeps its auto mood label', async () => {
    const classification = await useChatStore.getState().sendAutoRecognizedInput('写周报写得很烦');

    expect(classification?.kind).toBe('activity');
    expect(classification?.internalKind).toBe('new_activity');

    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].isMood).toBeUndefined();

    const moodState = useMoodStore.getState();
    expect(moodState.activityMood[messages[0].id]).toBe('down');
  });

  it('routes mood_about_last_activity sentence and links note to latest activity', async () => {
    const base = Date.now() - 5 * 60 * 1000;
    resetChatStore([
      {
        id: 'activity-eat',
        content: '吃饭',
        timestamp: base,
        type: 'text',
        mode: 'record',
        activityType: 'life',
        duration: undefined,
      },
    ]);

    const classification = await useChatStore.getState().sendAutoRecognizedInput('吃饭好开心');

    expect(classification?.kind).toBe('mood');
    expect(classification?.internalKind).toBe('mood_about_last_activity');
    expect(classification?.relatedActivityId).toBe('activity-eat');

    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(2);
    expect(messages[1].isMood).toBe(true);
    expect(useMoodStore.getState().moodNote['activity-eat']).toBe('吃饭好开心');
  });

  it('attaches standalone mood to ongoing activity only', async () => {
    const base = Date.now() - 5 * 60 * 1000;
    resetChatStore([
      {
        id: 'activity-ongoing',
        content: '写周报',
        timestamp: base,
        type: 'text',
        mode: 'record',
        activityType: 'life',
        duration: undefined,
      },
    ]);

    await useChatStore.getState().sendAutoRecognizedInput('好累');

    let moodState = useMoodStore.getState();
    expect(moodState.moodNote['activity-ongoing']).toBe('好累');
    expect(moodState.moodNoteMeta['activity-ongoing']?.source).toBe('auto');
    expect(moodState.moodNoteMeta['activity-ongoing']?.linkedMoodMessageId).toBeDefined();

    useMoodStore.setState({
      activityMood: {},
      activityMoodMeta: {},
      customMoodLabel: {},
      customMoodApplied: {},
      customMoodOptions: [],
      moodNote: {},
      moodNoteMeta: {},
    });
    resetChatStore([
      {
        id: 'activity-ended',
        content: '吃饭',
        timestamp: base,
        type: 'text',
        mode: 'record',
        activityType: 'life',
        duration: 20,
      },
    ]);

    await useChatStore.getState().sendAutoRecognizedInput('好累');

    moodState = useMoodStore.getState();
    expect(moodState.moodNote['activity-ended']).toBeUndefined();
    expect(moodState.moodNoteMeta['activity-ended']).toBeUndefined();
  });

  it('allows sending two activities back to back and closes the first one', async () => {
    const firstTs = 1_700_000_000_000;
    await useChatStore.getState().sendMessage('吃饭', firstTs);
    await useChatStore.getState().sendMessage('睡觉', 1_700_000_600_000);

    const state = useChatStore.getState();
    const messages = state.messages;
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe('吃饭');
    expect(messages[0].duration).toBe(10);
    expect(messages[0].isActive).toBe(false);
    expect(messages[1].content).toBe('睡觉');
    expect(messages[1].duration).toBeUndefined();
    expect(messages[1].isActive).toBe(true);

    const todayKey = getLocalDateString(new Date(firstTs));
    const cached = state.dateCache[todayKey] ?? [];
    expect(cached).toHaveLength(2);
    expect(cached[0].duration).toBe(10);
    expect(cached[0].isActive).toBe(false);
    expect(cached[1].isActive).toBe(true);
  });

  it('closes every ongoing activity before creating the next one', async () => {
    const base = 1_700_000_000_000;
    const olderOngoing: Message = {
      id: 'activity-ongoing-1',
      content: '写方案',
      timestamp: base,
      type: 'text',
      mode: 'record',
      activityType: 'work',
      duration: undefined,
      isActive: true,
    };
    const laterEnded: Message = {
      id: 'activity-ended-later',
      content: '吃饭',
      timestamp: base + 20 * 60 * 1000,
      type: 'text',
      mode: 'record',
      activityType: 'life',
      duration: 15,
      isActive: false,
    };
    const newerOngoing: Message = {
      id: 'activity-ongoing-2',
      content: '写代码',
      timestamp: base + 10 * 60 * 1000,
      type: 'text',
      mode: 'record',
      activityType: 'work',
      duration: undefined,
      isActive: true,
    };
    resetChatStore([olderOngoing, newerOngoing, laterEnded]);

    await useChatStore.getState().sendMessage('散步', base + 40 * 60 * 1000);

    const records = useChatStore.getState().messages.filter((message) => !message.isMood);
    const ongoing = records.filter((message) => message.duration === undefined);
    expect(ongoing).toHaveLength(1);
    expect(ongoing[0].content).toBe('散步');
    expect(records.find((message) => message.id === olderOngoing.id)?.isActive).toBe(false);
    expect(records.find((message) => message.id === newerOngoing.id)?.isActive).toBe(false);
    expect(records.find((message) => message.id === laterEnded.id)?.duration).toBe(15);
  });

});
