import React from 'react';
import { formatUserFacingDiagnostic, getAppRuntimeContext, logDiagnostic } from '../../lib/diagnostics';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: any };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    logDiagnostic('error', 'react.error_boundary.caught', {
      error,
      errorInfo,
      context: getAppRuntimeContext(),
      userFacing: formatUserFacingDiagnostic('页面渲染', error, {
        path: 'React ErrorBoundary',
      }),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-viewport-fixed flex items-center justify-center bg-[#f4f7f4] p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/80 bg-white/85 p-5 shadow-xl">
          <h2 className="app-section-title mb-2 text-slate-800">页面渲染出错</h2>
          <p className="app-body text-slate-700">
            这不是普通网络慢，而是 React 页面渲染阶段抛错。请保留 Xcode 控制台里的 react.error_boundary.caught 日志。
          </p>
          <pre className="app-caption mt-3 whitespace-pre-wrap text-slate-500">
            {formatUserFacingDiagnostic('页面渲染', this.state.error, { path: 'React ErrorBoundary' })}
          </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
