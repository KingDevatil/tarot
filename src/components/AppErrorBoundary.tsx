import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application startup failed', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="app-fallback" role="alert">
        <span className="app-fallback-mark" aria-hidden="true">✦</span>
        <h1>页面加载遇到问题</h1>
        <p>请刷新页面后重试。</p>
        <button type="button" onClick={() => window.location.reload()}>
          重新加载
        </button>
      </main>
    );
  }
}
