// DOC-DEPS: LLM.md -> docs/PROJECT_MAP.md -> src/store/README.md
import { isLegacyChatActivityType } from '../lib/activityType';
import { finalizeCrossDayOngoingMessages } from './chatDayBoundary';
import { getLocalDateString } from './chatHelpers';
import type { ChatState } from './useChatStore.types';

export const MANUAL_END_UNDO_MS = 3_000;

const pendingManualEndTimers = new Map<string, ReturnType<typeof setTimeout>>();

type ChatSetter = (
  partial: Partial<ChatState> | ((state: ChatState) => Partial<ChatState>)
) => void;

export const filterLegacyChatRows = <T extends { activity_type?: string | null }>(rows: T[]): T[] => rows.filter((row) => !isLegacyChatActivityType(row.activity_type));

export function clearPendingManualEndTimer(id: string): void {
  const timerId = pendingManualEndTimers.get(id);
  if (timerId !== undefined) {
    globalThis.clearTimeout(timerId);
    pendingManualEndTimers.delete(id);
  }
}

export function clearAllPendingManualEndTimers(): void {
  Array.from(pendingManualEndTimers.keys()).forEach(clearPendingManualEndTimer);
}

export function setPendingManualEndTimer(id: string, timerId: ReturnType<typeof setTimeout>): void {
  pendingManualEndTimers.set(id, timerId);
}

export function runChatNewDayRefresh(get: () => ChatState, set: ChatSetter): void {
  const nowMs = Date.now();
  const state = get();
  const { messages: finalizedMessages, finalized } = finalizeCrossDayOngoingMessages(state.messages, nowMs);
  if (finalized.length > 0) {
    set({ messages: finalizedMessages });
  }

  const todayStr = getLocalDateString(new Date(nowMs));
  if (!state.currentDateStr || state.currentDateStr !== todayStr) {
    const userOnHistorical = state.activeViewDateStr != null && state.activeViewDateStr !== state.currentDateStr;
    if (userOnHistorical) return;
    void state.fetchMessages();
  }
}
