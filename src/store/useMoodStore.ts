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
  customMoodLabel: Record<string, string | undefined>;
  customMoodOptions: string[];
  moodNote: Record<string, string | undefined>;
  setMood: (activityId: string, mood: MoodOption) => void;
  setCustomMoodLabel: (activityId: string, label: string | undefined) => void;
  addCustomMoodOption: (label: string) => void;
  setMoodNote: (activityId: string, note: string) => void;
  getMood: (activityId: string) => MoodOption | undefined;
  clear: () => void;
}

export const useMoodStore = create<MoodState>()(
  persist(
    (set, get) => ({
      activityMood: {},
      customMoodLabel: {},
      customMoodOptions: [],
      moodNote: {},
      setMood: (activityId, mood) =>
        set(state => ({
          activityMood: { ...state.activityMood, [activityId]: mood },
        })),
      setCustomMoodLabel: (activityId, label) =>
        set(state => ({
          customMoodLabel: { ...state.customMoodLabel, [activityId]: label },
        })),
      addCustomMoodOption: (label) =>
        set(state => {
          const value = label.trim();
          if (!value) return state;
          return {
            customMoodOptions: [value],
          };
        }),
      setMoodNote: (activityId, note) =>
        set(state => ({
          moodNote: { ...state.moodNote, [activityId]: note },
        })),
      getMood: (activityId) => get().activityMood[activityId],
      clear: () => set({ activityMood: {}, customMoodLabel: {}, moodNote: {} }),
    }),
    {
      name: 'activity-mood-storage',
      partialize: (state) => ({
        activityMood: state.activityMood,
        customMoodLabel: state.customMoodLabel,
        customMoodOptions: state.customMoodOptions,
        moodNote: state.moodNote,
      }),
    }
  )
);
