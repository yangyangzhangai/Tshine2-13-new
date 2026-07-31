// DOC-DEPS: LLM.md -> docs/CURRENT_TASK.md -> src/features/report/README.md
import { addDays, set, startOfDay } from 'date-fns';

export function getMyDiaryLockAt(reportDate: number | Date): number {
  return set(addDays(startOfDay(new Date(reportDate)), 1), {
    hours: 6,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  }).getTime();
}

export function canEditDailyMyDiary(reportDate: number | Date, now = new Date()): boolean {
  return now.getTime() < getMyDiaryLockAt(reportDate);
}
