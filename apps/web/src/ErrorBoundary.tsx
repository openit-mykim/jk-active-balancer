import { Component, type ErrorInfo, type ReactNode } from "react";
import { recordCrash } from "./crash-store";

interface Props {
  readonly title: string;
  readonly body: string;
  readonly retry: string;
  readonly children: ReactNode;
}

/** Render errors show a recoverable screen; the error is recorded locally. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    recordCrash(Object.assign(new Error(error.message), { name: error.name, stack: `${error.stack ?? ""}\n${info.componentStack ?? ""}` }), "render", false);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="empty" role="alert">
        <div className="empty-title">{this.props.title}</div>
        <div className="empty-body">{this.props.body}</div>
        <button type="button" className="btn-filled" onClick={() => this.setState({ failed: false })}>
          {this.props.retry}
        </button>
      </div>
    );
  }
}
