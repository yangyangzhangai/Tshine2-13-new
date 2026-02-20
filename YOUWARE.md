# Time Management App - Project Documentation

This project is a personal time management application built with React, TypeScript, and Tailwind CSS. It features conversation-based time tracking, todo management with Eisenhower Matrix, and AI-powered time reporting.

## Project Status

- **Project Type**: React + TypeScript Modern Web Application
- **Entry Point**: `src/main.tsx`
- **Build System**: Vite
- **Styling System**: Tailwind CSS

## Key Features

### 1. Conversation Log (对话记录)
- **Chat Mode**: Standard chat interface for logging thoughts.
- **Record Mode**: Logs activities and automatically calculates duration based on the time difference from the previous activity.
- **Duration Formatting**: Displays duration in "X小时Y分钟" format if > 60 minutes.
- **Data Persistence**: Uses `zustand` with `persist` middleware to save messages locally.

### 2. Todo Management (待办管理)
- **Views**: Daily, Weekly, Monthly filtering.
- **Prioritization**: Eisenhower Matrix (Urgent/Important, etc.).
- **Categorization**: Custom categories (Work, Study, Social, etc.).
- **Recurrence**: Support for Daily, Weekly, and Monthly recurring tasks.
- **Smart Expansion**: Expand/collapse arrow only appears for long text that is truncated.
- **Status**: Complete/Incomplete toggling.

### 3. Time Report (时间报告)
- **Calendar View**: Visual overview of days.
- **Report Types**: Daily, Weekly, Monthly, and Custom reports.
- **Data Visualization**:
    - **Daily**: Task completion rate, recurring task check-in status, priority breakdown.
    - **Weekly/Monthly**: Completion trend charts, recurring task consistency, priority analysis.
- **AI Analysis**: Placeholder integration for Coze workflow to analyze time usage and provide suggestions.

## Architecture

### Directory Structure

```
src/
├── api/               # API services (Coze, Supabase placeholders)
├── components/        # Shared components
│   ├── ui/            # UI primitives
│   └── BottomNav.tsx  # Main navigation
├── features/          # Feature-based modules
│   ├── chat/          # Chat & Record logic
│   ├── todo/          # Todo management logic
│   └── report/        # Reporting logic
├── lib/               # Utilities (cn, etc.)
├── store/             # State management (Zustand)
│   ├── useChatStore.ts
│   ├── useTodoStore.ts
│   └── useReportStore.ts
└── App.tsx            # Routing configuration
```

## External Integrations

### Coze AI
- **Status**: Placeholder implemented in `src/api/coze.ts`.
- **Usage**: Intended for analyzing daily activities and generating reports.

### Supabase
- **Status**: Placeholder implemented in `src/api/supabase.ts`.
- **Usage**: Intended for backend data storage.
- **Setup**: Uncomment initialization code in `src/api/supabase.ts` and provide `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` in `.env`.

## Development

- **Run Dev Server**: `npm run dev`
- **Build**: `npm run build`
