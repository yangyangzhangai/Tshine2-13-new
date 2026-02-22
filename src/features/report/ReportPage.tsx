import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useReportStore, Report, ReportStats } from '../../store/useReportStore';
import { useChatStore } from '../../store/useChatStore';
import { useTodoStore } from '../../store/useTodoStore';
import { FileText, Sparkles, X, BarChart2, Clock, CheckCircle, Circle } from 'lucide-react';
import { format, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { cn, formatDuration } from '../../lib/utils';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const ActivityRecordsView = ({ report }: { report: Report }) => {
  const messages = useChatStore(state => state.messages);
  const { t } = useTranslation();

  const start = report.startDate || startOfDay(new Date(report.date)).getTime();
  const end = report.endDate || endOfDay(new Date(report.date)).getTime();

  const activityMessages = messages.filter(m =>
    m.timestamp >= start && m.timestamp <= end &&
    m.type !== 'system' && m.mode === 'record'
  ).sort((a, b) => a.timestamp - b.timestamp);

  if (activityMessages.length === 0) return null;

  return (
    <div>
      <h3 className="font-bold mb-2 text-sm text-gray-700 flex items-center gap-2">
        <Clock size={16} /> {t('report_activity_records')}
      </h3>
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
        {activityMessages.map((msg, index) => (
          <div key={msg.id} className={cn(
            "flex items-center px-3 py-2 hover:bg-gray-50 transition-colors",
            index !== activityMessages.length - 1 && "border-b border-gray-50"
          )}>
            <span className="text-gray-400 font-mono text-xs w-24 flex-shrink-0">
              {format(msg.timestamp, 'MM-dd HH:mm')}
            </span>
            <span className="flex-1 text-xs text-gray-700 truncate mx-3" title={msg.content}>
              {msg.content}
            </span>
            {msg.duration ? (
              <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex-shrink-0 text-center whitespace-nowrap">
                {formatDuration(msg.duration, t)}
              </span>
            ) : (
              <span className="w-[36px]"></span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ReportStatsView = ({ stats, type, onShowTasks }: { stats: ReportStats, type: string, onShowTasks: (type: 'completed' | 'total') => void }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div
          className="bg-blue-50 p-3 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => onShowTasks('completed')}
        >
          <div className="text-2xl font-bold text-blue-600">{stats.completedTodos}</div>
          <div className="text-xs text-blue-400">{t('report_completed')}</div>
        </div>
        <div
          className="bg-gray-50 p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => onShowTasks('total')}
        >
          <div className="text-2xl font-bold text-gray-600">{stats.totalTodos}</div>
          <div className="text-xs text-gray-400">{t('report_total_tasks')}</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{(stats.completionRate * 100).toFixed(0)}%</div>
          <div className="text-xs text-green-400">{t('report_completion_rate')}</div>
        </div>
      </div>

      {/* Recurring Tasks */}
      {stats.recurringStats && stats.recurringStats.length > 0 && (
        <div>
          <h3 className="font-bold mb-3 text-sm text-gray-700">{t('report_habit_tracking')}</h3>
          <div className="space-y-2">
            {stats.recurringStats.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-white border border-gray-100 p-3 rounded-lg">
                <span className="text-sm font-medium">{item.name}</span>
                {type === 'daily' ? (
                  <span className={cn("px-2 py-1 rounded text-xs", item.completed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                    {item.completed ? t('report_checked') : t('report_unchecked')}
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${(item.rate || 0) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{item.count}/{item.total}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority Analysis */}
      <div>
        <h3 className="font-bold mb-3 text-sm text-gray-700">{t('report_quadrant_distribution')}</h3>
        <div className="space-y-2">
          {stats.priorityStats?.map((p) => (
            <div key={p.priority} className="flex items-center text-xs">
              <span className="w-24 text-gray-500">
                {p.priority === 'urgent-important' ? t('priority_urgent_important') :
                  p.priority === 'urgent-not-important' ? t('priority_urgent_not_important') :
                    p.priority === 'important-not-urgent' ? t('priority_important_not_urgent') : t('priority_not_important_not_urgent')}
              </span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden mx-2">
                <div
                  className={cn("h-full",
                    p.priority.includes('urgent') ? "bg-red-400" : "bg-blue-400"
                  )}
                  style={{ width: `${p.count > 0 ? (p.completed / p.count) * 100 : 0}%` }}
                />
              </div>
              <span className="text-gray-400 w-10 text-right">{p.completed}/{p.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Trend */}
      {type !== 'daily' && stats.dailyCompletion && (
        <div>
          <h3 className="font-bold mb-3 text-sm text-gray-700">{t('report_completion_trend')}</h3>
          <div className="flex items-end justify-between h-24 gap-1 pt-4 border-t border-gray-100">
            {stats.dailyCompletion.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-blue-100 rounded-t-sm relative group" style={{ height: `${Math.max(day.rate * 100, 5)}%` }}>
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black text-white text-[10px] p-1 rounded whitespace-nowrap z-10">
                    {day.completed}/{day.total}
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 transform -rotate-45 origin-top-left translate-y-4">{day.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ReportPage = () => {
  const [date, setDate] = useState<Value>(new Date());
  const { reports, generateReport, triggerAIAnalysis, generateTimeshineDiary } = useReportStore();
  const { todos } = useTodoStore();
  const { t } = useTranslation();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showReportList, setShowReportList] = useState<'weekly' | 'monthly' | 'custom' | null>(null);

  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showTaskList, setShowTaskList] = useState<'completed' | 'total' | null>(null);

  // Derive active report from store to ensure reactivity
  const selectedReport = reports.find(r => r.id === selectedReportId) || null;

  const handleDateClick = (value: Date) => {
    // Check if report exists for this date
    const existingReport = reports.find(r =>
      r.type === 'daily' &&
      new Date(r.date).toDateString() === value.toDateString()
    );

    if (existingReport) {
      setSelectedReportId(existingReport.id);
    } else {
      // Auto generate basic report
      generateReport('daily', value.getTime());
      setTimeout(() => {
        const newReport = useReportStore.getState().reports.find(r =>
          r.type === 'daily' &&
          new Date(r.date).toDateString() === value.toDateString()
        );
        if (newReport) setSelectedReportId(newReport.id);
      }, 50);
    }
  };

  const generateAndOpenReport = (type: 'weekly' | 'monthly' | 'custom') => {
    if (type === 'custom') {
      if (!customStartDate || !customEndDate) return;
      generateReport('custom', new Date(customStartDate).getTime(), new Date(customEndDate).getTime());
    } else {
      const targetDate = date instanceof Date ? date.getTime() : Date.now();
      generateReport(type, targetDate);
    }

    // Find and open
    setTimeout(() => {
      // This is a bit loose, finding the latest report of type
      const allReports = useReportStore.getState().reports;
      const newReport = allReports.filter(r => r.type === type).pop();
      if (newReport) {
        setSelectedReportId(newReport.id);
        setShowReportList(null);
      }
    }, 50);
  };

  const openReportList = (type: 'weekly' | 'monthly' | 'custom') => {
    setShowReportList(type);
  };

  const filteredReports = showReportList
    ? reports.filter(r => r.type === showReportList)
    : [];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50 overflow-y-auto">
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-center">{t('report_title')}</h1>
      </header>

      <div className="p-4 pb-24 space-y-6">
        {/* Calendar Section */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-500 mb-3">{t('report_calendar_view')}</h2>
          <div className="calendar-wrapper flex justify-center">
            <Calendar
              onChange={setDate}
              value={date}
              onClickDay={handleDateClick}
              className="w-full border-none text-sm"
            />
          </div>
        </div>

        {/* Report Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => openReportList('weekly')}
            className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-blue-50 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-2">
              <FileText size={20} />
            </div>
            <span className="text-xs font-medium">{t('report_weekly')}</span>
          </button>

          <button
            onClick={() => openReportList('monthly')}
            className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-purple-50 transition-colors"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-2">
              <FileText size={20} />
            </div>
            <span className="text-xs font-medium">{t('report_monthly')}</span>
          </button>

          <button
            onClick={() => openReportList('custom')}
            className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-orange-50 transition-colors"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-2">
              <Sparkles size={20} />
            </div>
            <span className="text-xs font-medium">{t('report_custom')}</span>
          </button>
        </div>
      </div>

      {/* Report List Modal */}
      {showReportList && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 h-[60vh] flex flex-col animate-in slide-in-from-bottom-10 fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">
                {showReportList === 'weekly' ? t('report_weekly') : showReportList === 'monthly' ? t('report_monthly') : t('report_custom')}
              </h2>
              <button onClick={() => setShowReportList(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">{t('report_coming_soon')}</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                {showReportList === 'weekly'
                  ? t('report_weekly_coming_soon')
                  : showReportList === 'monthly'
                    ? t('report_monthly_coming_soon')
                    : t('report_custom_coming_soon')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 max-h-[80vh] overflow-y-auto animate-in zoom-in-95 fade-in">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{selectedReport.title}</h2>
                <p className="text-sm text-gray-500">{format(selectedReport.date, 'yyyy-MM-dd HH:mm')}</p>
              </div>
              <button onClick={() => setSelectedReportId(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* AI Analysis */}
              <div className="bg-blue-50 p-4 rounded-lg text-blue-800">
                <h3 className="font-bold flex items-center gap-2 mb-2 text-sm">
                  <Sparkles size={16} /> {t('report_observer_analysis')}
                </h3>

                {/* 未生成状态 */}
                {(!selectedReport.aiAnalysis || selectedReport.aiAnalysis === '观察员分析功能即将上线...') ? (
                  <div className="text-center py-2">
                    <p className="text-sm opacity-80 mb-3">{t('report_observer_waiting')}</p>
                    <button
                      onClick={() => {
                        if (window.confirm(t('report_generate_confirm'))) {
                          generateTimeshineDiary(selectedReport.id);
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      {t('report_generate_diary')}
                    </button>
                  </div>
                ) : selectedReport.aiAnalysis === '正在生成观察手记...' ? (
                  /* 生成中状态 */
                  <div className="flex flex-col items-center justify-center py-4 space-y-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-blue-800 tracking-wide mt-2">{t('report_generating')}</p>
                    <p className="text-xs text-blue-500 opacity-80 mt-1">{t('report_generating_patience')}</p>
                  </div>
                ) : (selectedReport.aiAnalysis.includes('请稍后重试') || selectedReport.aiAnalysis.startsWith('生成手记失败') || selectedReport.aiAnalysis.startsWith('生成观察手记时出错')) ? (
                  /* 错误状态 - 可以重试 */
                  <div className="bg-red-50 p-3 rounded border border-red-100">
                    <p className="text-sm text-red-600 mb-2">{selectedReport.aiAnalysis}</p>
                    <button
                      onClick={() => generateTimeshineDiary(selectedReport.id)}
                      className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50"
                    >
                      {t('retry')}
                    </button>
                  </div>
                ) : (
                  /* 已生成状态 - 仅展示，不可再次生成 */
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-200/50">
                      <Sparkles size={14} className="text-blue-600" />
                      <span className="text-xs font-medium text-blue-700">{t('report_from_prism')}</span>
                    </div>
                    <p className="text-sm opacity-80 whitespace-pre-wrap">{selectedReport.aiAnalysis}</p>
                  </div>
                )}
              </div>

              {/* Activity Records */}
              <ActivityRecordsView report={selectedReport} />

              {/* Stats View */}
              {selectedReport.stats ? (
                <ReportStatsView
                  stats={selectedReport.stats}
                  type={selectedReport.type}
                  onShowTasks={setShowTaskList}
                />
              ) : (
                <div className="text-gray-500 text-center py-10">{t('no_data')}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task List Modal */}
      {showTaskList && selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 max-h-[70vh] flex flex-col animate-in zoom-in-95 fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">
                {showTaskList === 'completed' ? t('report_completed_tasks') : t('report_all_tasks')}
              </h2>
              <button onClick={() => setShowTaskList(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {(() => {
                const start = selectedReport.startDate || startOfDay(new Date(selectedReport.date)).getTime();
                const end = selectedReport.endDate || endOfDay(new Date(selectedReport.date)).getTime();

                const reportTodos = todos.filter(t =>
                  t.dueDate >= start && t.dueDate <= end
                );

                const displayTodos = showTaskList === 'completed'
                  ? reportTodos.filter(t => t.completed)
                  : reportTodos;

                if (displayTodos.length === 0) {
                  return <div className="text-center text-gray-400 py-8">{t('report_no_tasks')}</div>;
                }

                return displayTodos.map(todo => (
                  <div key={todo.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className={cn("mr-3", todo.completed ? "text-green-500" : "text-gray-300")}>
                      {todo.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
                    </div>
                    <div className="flex-1">
                      <div className={cn("text-sm font-medium", todo.completed && "line-through text-gray-400")}>
                        {todo.content}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {format(todo.dueDate, 'MM-dd')} · {todo.category}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
