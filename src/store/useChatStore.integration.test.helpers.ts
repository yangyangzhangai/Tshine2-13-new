import { beforeEach, vi } from 'vitest';

vi.mock('../lib/supabase-utils', () => ({
  getSupabaseSession: vi.fn(async () => null),
}));

vi.mock('./useAnnotationStore', () => ({
  useAnnotationStore: {
    getState: () => ({
      triggerAnnotation: vi.fn(async () => undefined),
      removeEventsByMessageId: vi.fn(),
    }),
  },
}));

import { useMoodStore } from './useMoodStore';
import { useChatStore } from './useChatStore';
import { useOutboxStore } from './useOutboxStore';
import { useTodoStore } from './useTodoStore';
import type { Message } from './useChatStore.types';
import { resetLiveInputTelemetry } from '../services/input/liveInputTelemetry';
import { getSupabaseSession } from '../lib/supabase-utils';
import { supabase } from '../api/supabase';

function resetMoodStore() {
  useMoodStore.setState({
    activityMood: {},
    activityMoodMeta: {},
    customMoodLabel: {},
    customMoodApplied: {},
    customMoodOptions: [],
    moodNote: {},
    moodNoteMeta: {},
  });
}

function resetChatStore(messages: Message[] = []) {
  useChatStore.setState({
    messages,
    pendingManualEnds: {},
    lastActivityTime: null,
    isMoodMode: false,
    isLoading: false,
    hasInitialized: true,
    oldestLoadedDate: null,
    hasMoreHistory: true,
    isLoadingMore: false,
    yesterdaySummary: null,
    currentDateStr: null,
    activeViewDateStr: null,
    dateCache: {},
  });
}

function resetTodoStore() {
  useTodoStore.setState({
    todos: [],
    activeMessageMap: {},
    todoCompletionMessageMap: {},
    todoBottleStarRewardMap: {},
    messageBottleStarRewardMap: {},
    pendingDeletedTodoIds: {},
    suppressedTemplateDateMap: {},
    activeTodoId: null,
    isLoading: false,
    hasHydrated: false,
    lastFetchedAt: null,
    lastSyncError: null,
    lastGeneratedDate: '',
  });
}

export function installChatStoreIntegrationTestHarness() {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    resetMoodStore();
    resetChatStore();
    resetTodoStore();
    useOutboxStore.setState({ entries: [] });
    resetLiveInputTelemetry();
    vi.mocked(getSupabaseSession).mockResolvedValue(null as never);
  });
}

export type { Message };
export const testGetSupabaseSession = getSupabaseSession;
export const testResetChatStore = resetChatStore;
export const testSupabase = supabase;
export const testUseChatStore = useChatStore;
export const testUseMoodStore = useMoodStore;
export const testUseOutboxStore = useOutboxStore;
export const testUseTodoStore = useTodoStore;
