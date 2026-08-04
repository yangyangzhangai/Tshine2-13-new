import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useChatStore } from '../../store/useChatStore';
import type { Report } from '../../store/useReportStore';
import { cn } from '../../lib/utils';
import { formatDuration } from '../../lib/time';
import { getReportRange, getMessagesForReport } from './reportPageHelpers';

interface ActivityRecordsViewProps {
  report: Report;
}

export const ActivityRecordsView: React.FC<ActivityRecordsViewProps> = ({ report }) => {
  const globalMessages = useChatStore((state) => state.messages);
  const dateCache = useChatStore((state) => state.dateCache);
  const messages = getMessagesForReport(globalMessages, dateCache, report);
  const { t } = useTranslation();
  const { start, end } = getReportRange(report);

  const activityMessages = messages
    .filter(
      (m) =>
        m.timestamp >= start &&
        m.timestamp <= end &&
        m.type !== 'system' &&
        m.mode === 'record'
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  if (activityMessages.length === 0) return null;

  return (
    <div>
      <div className="app-caption">
        <h3 className="app-caption mb-1 flex items-center gap-1 font-semibold">
          <Clock size={16} strokeWidth={1.5} /> {t('report_activity')}
        </h3>
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
          {activityMessages.map((msg, index) => (
            <div
              key={msg.id}
              className={cn(
                'flex items-center px-2.5 py-1.5 hover:bg-gray-50 transition-colors',
                index !== activityMessages.length - 1 && 'border-b border-gray-50'
              )}
            >
              <span className="app-badge w-20 flex-shrink-0 font-mono text-gray-400">
                {format(msg.timestamp, 'MM-dd HH:mm')}
              </span>
              <span className="app-caption mx-2 flex-1 truncate text-gray-700" title={msg.content}>
                {msg.content}
              </span>
              {msg.duration ? (
                <span className="app-badge flex-shrink-0 whitespace-nowrap rounded-full bg-blue-50 px-1.5 py-0.5 text-center text-blue-600">
                  {formatDuration(msg.duration, t)}
                </span>
              ) : (
                <span className="w-[36px]"></span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
