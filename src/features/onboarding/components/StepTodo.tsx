// DOC-DEPS: LLM.md -> docs/CURRENT_TASK.md -> src/features/onboarding/OnboardingFlow.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Clock, Flag, Repeat, X } from 'lucide-react';

type TodoUrgency = 'low' | 'medium' | 'high';

export type OnboardingTodoDraft = {
  id: string;
  text: string;
  done: boolean;
  time: string;
  urgency: TodoUrgency;
  repeat: boolean;
};

type StepTodoProps = {
  onNext: (todos: OnboardingTodoDraft[]) => void;
};

export function StepTodo({ onNext }: StepTodoProps) {
  const { t } = useTranslation();
  const [todo, setTodo] = useState('');
  const [time, setTime] = useState(
    `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
  );
  const [urgency, setUrgency] = useState<TodoUrgency>('medium');
  const [isRepeating, setIsRepeating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [todos, setTodos] = useState<OnboardingTodoDraft[]>([]);

  const addTodo = () => {
    if (!todo.trim()) return;
    const newTodo: OnboardingTodoDraft = {
      id: Date.now().toString(),
      text: todo,
      done: false,
      time,
      urgency,
      repeat: isRepeating,
    };

    setTodos([newTodo, ...todos]);
    setTodo('');
    setIsExpanded(false);
  };

  const removeTodo = (id: string) => {
    setTodos(todos.filter((t) => t.id !== id));
  };

  const URGENCY_LEVELS: { id: TodoUrgency; label: string; color: string }[] = [
    { id: 'low', label: t('growth_todo_priority_low'), color: 'bg-blue-100 text-blue-600 border-blue-200' },
    { id: 'medium', label: t('growth_todo_priority_medium'), color: 'bg-orange-100 text-orange-600 border-orange-200' },
    { id: 'high', label: t('growth_todo_priority_high'), color: 'bg-red-100 text-red-600 border-red-200' },
  ];

  return (
    <div className="flex-1 flex flex-col px-8 pt-16 pb-12 overflow-y-auto no-scrollbar bg-[#f4f7f4]">
      <div className="mb-8">
        <h2 className="app-page-title font-black text-[#4a5d4c]">{t('onboarding2_todo_title')}</h2>
      </div>

      <div className="space-y-6">
        <div className="bg-white border border-[#4a5d4c]/5 p-6 rounded-[32px] shadow-sm space-y-4 focus-within:border-[#8fae91] transition-all overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded-full border-2 border-[#8fae91]/30 flex-shrink-0" />
            <input
              type="text"
              value={todo}
              onChange={(e) => setTodo(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTodo(); } }}
              enterKeyHint="done"
          className="app-form-text flex-1 bg-transparent border-none outline-none text-[#4a5d4c] font-bold placeholder:text-[#4a5d4c]/20"
              placeholder={t('onboarding2_todo_add_placeholder')}
            />
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-4"
              >
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#4a5d4c]/5">
                  <div className="flex flex-col gap-1.5">
                    <label className="app-badge flex items-center gap-1 font-black uppercase text-[#4a5d4c]/40">
                      <Clock size={10} /> {t('growth_todo_due_date')}
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
            className="app-form-text bg-[#4a5d4c]/5 border-none rounded-xl px-3 py-2 font-bold text-[#4a5d4c] outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="app-badge flex items-center gap-1 font-black uppercase text-[#4a5d4c]/40">
                      <Repeat size={10} /> {t('growth_todo_recurrence')}
                    </label>
                    <button
                      onClick={() => setIsRepeating(!isRepeating)}
                      className={`app-description flex items-center justify-between rounded-xl px-3 py-2 font-bold transition-all ${
                        isRepeating ? 'bg-[#8fae91] text-white' : 'bg-[#4a5d4c]/5 text-[#4a5d4c]/40'
                      }`}
                    >
                      {isRepeating ? t('growth_todo_recurrence_daily') : t('growth_todo_recurrence_once')}
                      <div
                        className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${
                          isRepeating ? 'translate-x-0' : '-translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="app-badge flex items-center gap-1 font-black uppercase text-[#4a5d4c]/40">
                    <Flag size={10} /> {t('growth_todo_priority')}
                  </label>
                  <div className="flex gap-2">
                    {URGENCY_LEVELS.map((level) => (
                      <button
                        key={level.id}
                        onClick={() => setUrgency(level.id)}
                        className={`app-description flex-1 rounded-xl border px-1 py-2 font-bold transition-all ${
                          urgency === level.id
                            ? `${level.color} shadow-sm`
                            : 'bg-[#4a5d4c]/5 text-[#4a5d4c]/40 border-transparent hover:border-[#4a5d4c]/10'
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="app-body flex-1 rounded-2xl bg-[#4a5d4c]/5 py-4 font-bold text-[#4a5d4c]/40"
                  >
                    {t('onboarding_back')}
                  </button>
                  <button
                    onClick={addTodo}
                    disabled={!todo.trim()}
                    className={`app-body flex-[2] py-4 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold ${
                      todo.trim() ? 'bg-[#4a5d4c] text-white shadow-lg shadow-[#4a5d4c]/20' : 'bg-[#4a5d4c]/5 text-[#4a5d4c]/20'
                    }`}
                  >
                    <Check size={18} strokeWidth={3} />
                    {t('growth_todo_add')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence initial={false}>
          {todos.length > 0 && (
            <div className="space-y-3">
              {todos.map((todoItem) => (
                <motion.div
                  key={todoItem.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white/40 border border-white p-4 rounded-2xl flex items-center justify-between group backdrop-blur-sm shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full border-2 border-[#8fae91]" />
                    <div>
                      <span className="app-body block font-bold text-[#4a5d4c]">{todoItem.text}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="app-badge flex items-center gap-1 text-[#4a5d4c]/50">
                          <Clock size={10} /> {todoItem.time}
                        </span>
                        {todoItem.repeat && (
                          <span className="app-badge text-[#4a5d4c]/50">
                            <Repeat size={10} />
                          </span>
                        )}
                        <span
                          className={`app-badge rounded-full border px-1.5 py-0.5 font-bold ${
                            todoItem.urgency === 'high'
                              ? 'bg-red-50 text-red-500 border-red-100'
                              : todoItem.urgency === 'medium'
                                ? 'bg-orange-50 text-orange-500 border-orange-100'
                                : 'bg-blue-50 text-blue-500 border-blue-100'
                          }`}
                        >
                          {todoItem.urgency === 'high'
                            ? t('growth_todo_priority_high')
                            : todoItem.urgency === 'medium'
                              ? t('growth_todo_priority_medium')
                              : t('growth_todo_priority_low')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeTodo(todoItem.id)} className="app-hit-target-44 p-2 text-[#4a5d4c]/20 hover:text-red-400 transition-colors">
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

      </div>

      <div className="mt-auto pt-8">
        {todos.length > 0 ? (
          <button
            onClick={() => onNext(todos)}
            className="app-section-title w-full rounded-[28px] bg-[#4a5d4c] py-5 font-bold text-white shadow-xl shadow-[#4a5d4c]/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            {t('onboarding_next')} <ChevronRight size={20} />
          </button>
        ) : (
          <div className="app-caption py-5 text-center font-bold uppercase text-[#4a5d4c]/30">
            {t('onboarding2_todo_hint')}
          </div>
        )}
      </div>
    </div>
  );
}
