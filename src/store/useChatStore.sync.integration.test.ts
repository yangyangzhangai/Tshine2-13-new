import { describe, expect, it, vi } from 'vitest';

import {
  installChatStoreIntegrationTestHarness,
  Message,
  testGetSupabaseSession,
  testResetChatStore,
  testUseChatStore,
  testUseMoodStore,
  testUseOutboxStore,
  testUseTodoStore,
} from './useChatStore.integration.test.helpers';
import { getLocalDateString } from './chatHelpers';

const getSupabaseSession = testGetSupabaseSession;
const resetChatStore = testResetChatStore;
const useChatStore = testUseChatStore;
const useMoodStore = testUseMoodStore;
const useOutboxStore = testUseOutboxStore;
const useTodoStore = testUseTodoStore;

describe('useChatStore integration: sync, images, and deletion flow', () => {
  installChatStoreIntegrationTestHarness();

  it('keeps offline chat message as pending and enqueues outbox replay', async () => {
    await useChatStore.getState().sendMessage('离线记录', 1_700_000_000_000);

    const [message] = useChatStore.getState().messages;
    expect(message.syncState).toBe('pending');
    expect(useOutboxStore.getState().entries).toHaveLength(1);
    expect(useOutboxStore.getState().entries[0].kind).toBe('chat.upsert');
  });

  it('ends a started todo\'s linked activity and clears the todo-message link', async () => {
    const startedAt = 1_700_000_000_000;
    const endedAt = startedAt + 12 * 60 * 1000;
    const dateKey = getLocalDateString(new Date(startedAt));
    const activity: Message = {
      id: 'linked-activity',
      content: '写方案',
      timestamp: startedAt,
      type: 'text',
      mode: 'record',
      activityType: 'work',
      isActive: true,
      duration: undefined,
      syncState: 'synced',
      syncError: null,
    };
    resetChatStore([activity]);
    useChatStore.setState({ dateCache: { [dateKey]: [activity] }, activeViewDateStr: dateKey });
    useTodoStore.setState({
      todos: [{
        id: 'todo-1',
        title: '写方案',
        completed: false,
        createdAt: startedAt,
        priority: 'medium',
        recurrence: 'once',
        isTemplate: false,
        sortOrder: startedAt,
        startedAt,
      }],
      activeMessageMap: { 'linked-activity': 'todo-1' },
    });

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(endedAt);

    await useChatStore.getState().endActivity('linked-activity', { todoId: 'todo-1' });
    nowSpy.mockRestore();

    const chatState = useChatStore.getState();
    const ended = chatState.messages[0];
    expect(ended.isActive).toBe(false);
    expect(ended.duration).toBe(12);
    expect(ended.syncState).toBe('pending');
    expect(chatState.dateCache[dateKey][0].isActive).toBe(false);

    const todoState = useTodoStore.getState();
    expect(todoState.todos[0].completed).toBe(true);
    expect(todoState.getLinkedMessageIdForTodo('todo-1')).toBeNull();
    expect(todoState.activeMessageMap['linked-activity']).toBeUndefined();
    expect(useOutboxStore.getState().entries.some((entry) => entry.kind === 'chat.upsert')).toBe(true);
  });

  it('updates the second activity image without touching the first and keeps dateCache in sync', async () => {
    const base = 1_700_000_000_000;
    const dateKey = getLocalDateString(new Date(base));
    const activity: Message = {
      id: 'activity-images',
      content: '散步',
      timestamp: base,
      type: 'text',
      mode: 'record',
      activityType: 'life',
      duration: 20,
      imageUrl: 'https://example.com/first.jpg',
      imageUrl2: null,
    };
    resetChatStore([activity]);
    useChatStore.setState({ dateCache: { [dateKey]: [activity] }, activeViewDateStr: dateKey });

    await useChatStore.getState().updateMessageImage(activity.id, 'imageUrl2', 'https://example.com/second.jpg');

    const state = useChatStore.getState();
    expect(state.messages[0].imageUrl).toBe('https://example.com/first.jpg');
    expect(state.messages[0].imageUrl2).toBe('https://example.com/second.jpg');
    expect(state.dateCache[dateKey][0].imageUrl).toBe('https://example.com/first.jpg');
    expect(state.dateCache[dateKey][0].imageUrl2).toBe('https://example.com/second.jpg');
  });

  it('queues a durable chat sync when an image slot changes offline', async () => {
    const base = 1_700_000_000_000;
    const dateKey = getLocalDateString(new Date(base));
    const activity: Message = {
      id: 'activity-image-offline',
      content: '散步',
      timestamp: base,
      type: 'text',
      mode: 'record',
      activityType: 'life',
      duration: 20,
      imageUrl: 'https://example.com/first.jpg',
      imageUrl2: null,
      syncState: 'synced',
      syncError: null,
    };
    resetChatStore([activity]);
    useChatStore.setState({ dateCache: { [dateKey]: [activity] }, activeViewDateStr: dateKey });
    vi.mocked(getSupabaseSession).mockResolvedValue(null as never);

    await useChatStore.getState().updateMessageImage(activity.id, 'imageUrl2', 'https://example.com/new-second.jpg');

    const state = useChatStore.getState();
    expect(state.messages[0].imageUrl2).toBe('https://example.com/new-second.jpg');
    expect(state.messages[0].syncState).toBe('pending');
    expect(useOutboxStore.getState().entries.some((entry) => (
      entry.kind === 'chat.upsert'
      && entry.payload.message.id === activity.id
      && entry.payload.message.imageUrl2 === 'https://example.com/new-second.jpg'
    ))).toBe(true);
  });

  it('keeps local data-url image changes pending until storage reupload finishes', async () => {
    const base = 1_700_000_000_000;
    const dateKey = getLocalDateString(new Date(base));
    const activity: Message = {
      id: 'activity-image-local-only',
      content: '散步',
      timestamp: base,
      type: 'text',
      mode: 'record',
      activityType: 'life',
      duration: 20,
      imageUrl: null,
      imageUrl2: null,
      syncState: 'synced',
      syncError: null,
    };
    resetChatStore([activity]);
    useChatStore.setState({ dateCache: { [dateKey]: [activity] }, activeViewDateStr: dateKey });
    vi.mocked(getSupabaseSession).mockResolvedValue({ user: { id: 'user-1' } } as never);

    await useChatStore.getState().updateMessageImage(activity.id, 'imageUrl', 'data:image/jpeg;base64,abc');

    const state = useChatStore.getState();
    expect(state.messages[0].imageUrl).toBe('data:image/jpeg;base64,abc');
    expect(state.messages[0].syncState).toBe('pending');
    expect(useOutboxStore.getState().entries.some((entry) => entry.kind === 'chat.upsert')).toBe(false);
  });

  it('removes a deleted activity from messages and every date cache bucket', async () => {
    const base = 1_700_000_000_000;
    const firstDateKey = getLocalDateString(new Date(base));
    const secondDateKey = getLocalDateString(new Date(base + 24 * 60 * 60 * 1000));
    const deletedActivity: Message = {
      id: 'todo-completion-activity',
      content: '剪指甲',
      timestamp: base,
      type: 'text',
      mode: 'record',
      activityType: 'life',
      duration: 5,
    };
    const retainedActivity: Message = {
      ...deletedActivity,
      id: 'retained-activity',
      content: '散步',
      timestamp: base + 24 * 60 * 60 * 1000,
    };
    resetChatStore([deletedActivity, retainedActivity]);
    useChatStore.setState({
      pendingManualEnds: { [deletedActivity.id]: Date.now() + 3_000 },
      dateCache: {
        [firstDateKey]: [deletedActivity],
        [secondDateKey]: [deletedActivity, retainedActivity],
      },
    });
    useMoodStore.setState({
      activityMood: { [deletedActivity.id]: 'down', [retainedActivity.id]: 'happy' },
      moodNote: { [deletedActivity.id]: '需要休息' },
    });
    useOutboxStore.getState().enqueue({
      kind: 'mood.upsert',
      payload: { messageId: deletedActivity.id, patch: { mood_label: 'down' } },
      consecutiveFailures: 0,
    });

    await useChatStore.getState().deleteActivity(deletedActivity.id);

    const state = useChatStore.getState();
    const moodState = useMoodStore.getState();
    expect(state.messages.map(message => message.id)).toEqual([retainedActivity.id]);
    expect(state.dateCache[firstDateKey]).toEqual([]);
    expect(state.dateCache[secondDateKey].map(message => message.id)).toEqual([retainedActivity.id]);
    expect(state.pendingManualEnds[deletedActivity.id]).toBeUndefined();
    expect(moodState.activityMood[deletedActivity.id]).toBeUndefined();
    expect(moodState.moodNote[deletedActivity.id]).toBeUndefined();
    expect(moodState.activityMood[retainedActivity.id]).toBe('happy');
    expect(useOutboxStore.getState().entries).toEqual([]);
  });

  it('keeps older local records when fetchMessages runs without a signed-in session', async () => {
    const base = 1_700_000_000_000;
    resetChatStore([
      {
        id: 'event-yesterday',
        content: 'Review notes',
        timestamp: base,
        type: 'text',
        mode: 'record',
        activityType: 'work',
      },
      {
        id: 'legacy',
        content: 'Legacy row',
        timestamp: base + 1_000,
        type: 'text',
        mode: 'record',
        activityType: 'chat' as never,
      },
      {
        id: 'event-today',
        content: 'Ship patch',
        timestamp: base + 2_000,
        type: 'text',
        mode: 'record',
        activityType: 'work',
      },
    ]);

    await useChatStore.getState().fetchMessages();

    expect(useChatStore.getState().messages.map((message) => message.id)).toEqual([
      'event-yesterday',
      'event-today',
    ]);
  });
});
