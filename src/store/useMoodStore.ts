import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MoodOption =
  | '开心'
  | '平静'
  | '专注'
  | '满足'
  | '疲惫'
  | '焦虑'
  | '无聊'
  | '低落';

interface MoodState {
  activityMood: Record<string, MoodOption | undefined>;
  setMood: (activityId: string, mood: MoodOption) => void;
  getMood: (activityId: string) => MoodOption | undefined;
  clear: () => void;
}

export const useMoodStore = create<MoodState>()(
  persist(
    (set, get) => ({
      activityMood: {},
      setMood: (activityId, mood) =>
        set(state => ({
          activityMood: { ...state.activityMood, [activityId]: mood },
        })),
      getMood: (activityId) => get().activityMood[activityId],
      clear: () => set({ activityMood: {} }),
    }),
    {
      name: 'activity-mood-storage',
      partialize: (state) => ({
        activityMood: state.activityMood,
      }),
    }
  )
);
