import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { useChatStore } from './useChatStore';
import { useTodoStore } from './useTodoStore';
import { useReportStore } from './useReportStore';

interface AuthState {
  user: any | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, pass: string) => Promise<{ error: any }>;
  signUp: (email: string, pass: string, nickname?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  initialize: async () => {
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    set({ user: session?.user || null, loading: false });

    // Listen for changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      const previousUser = get().user;
      const currentUser = session?.user || null;

      set({ user: currentUser, loading: false });

      if (event === 'SIGNED_IN' && currentUser && !previousUser) {
        console.log('User signed in. Syncing local data...');
        await syncLocalDataToSupabase(currentUser.id);

        // After sync, fetch the latest data from server (which now includes our synced data)
        await useChatStore.getState().fetchMessages();
        await useTodoStore.getState().fetchTodos();
        await useReportStore.getState().fetchReports();
      }
      else if (event === 'SIGNED_OUT') {
        console.log('User signed out. Clearing local state...');
        useChatStore.setState({ messages: [] });
        useTodoStore.setState({ todos: [] });
        useReportStore.setState({ reports: [] });
      }
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  },

  signUp: async (email, password, nickname) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: nickname || email.split('@')[0]
        }
      }
    });
    return { error };
  },

  signOut: async () => {
    await supabase.auth.signOut();
  }
}));

async function syncLocalDataToSupabase(userId: string) {
  const messages = useChatStore.getState().messages;
  const todos = useTodoStore.getState().todos;

  // 1. Sync Messages
  if (messages.length > 0) {
    const messagesToUpload = messages.map(m => ({
      id: m.id,
      content: m.content,
      timestamp: m.timestamp,
      type: m.type,
      duration: m.duration,
      activity_type: m.activityType,
      user_id: userId
    }));

    // We use upsert to avoid conflicts if IDs somehow match, 
    // but typically local IDs (UUIDs) won't conflict with others.
    const { error } = await supabase.from('messages').upsert(messagesToUpload);
    if (error) {
      console.error('Error syncing messages:', error);
    } else {
      console.log(`Synced ${messages.length} messages.`);
    }
  }

  // 2. Sync Todos
  if (todos.length > 0) {
    const todosToUpload = todos.map(t => ({
      id: t.id,
      content: t.content,
      completed: t.completed,
      priority: t.priority,
      category: t.category,
      due_date: t.dueDate,
      scope: t.scope,
      created_at: t.createdAt,
      recurrence: t.recurrence,
      recurrence_id: t.recurrenceId,
      completed_at: t.completedAt,
      // Note: is_pinned is local-only for now as per previous context
      user_id: userId
    }));

    const { error } = await supabase.from('todos').upsert(todosToUpload);
    if (error) {
      console.error('Error syncing todos:', error);
    } else {
      console.log(`Synced ${todos.length} todos.`);
    }
  }

  // 3. Sync Reports
  const reports = useReportStore.getState().reports;
  if (reports.length > 0) {
    const reportsToUpload = reports.map(r => ({
      id: r.id,
      title: r.title,
      date: r.date,
      start_date: r.startDate,
      end_date: r.endDate,
      type: r.type,
      content: r.content,
      ai_analysis: r.aiAnalysis,
      stats: r.stats,
      user_id: userId
    }));

    const { error } = await supabase.from('reports').upsert(reportsToUpload);
    if (error) {
      console.error('Error syncing reports:', error);
    } else {
      console.log(`Synced ${reports.length} reports.`);
    }
  }
}
