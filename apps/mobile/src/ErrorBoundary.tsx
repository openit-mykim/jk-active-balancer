import { Component, type ErrorInfo, type ReactNode } from "react";
import { View } from "react-native";
import { SPACE, THEME } from "@jk-active-balancer/ui-common";
import { recordCrash } from "./crash-store";
import { Button, Illustration, Txt } from "./ui";

interface Props {
  readonly title: string;
  readonly body: string;
  readonly retry: string;
  readonly children: ReactNode;
}

/** Render errors show a recoverable screen instead of closing the app; the error is recorded locally. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    const withStack = Object.assign(new Error(error.message), { name: error.name, stack: `${error.stack ?? ""}\n${info.componentStack ?? ""}` });
    void recordCrash(withStack, "render", false);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: THEME.background, alignItems: "center", justifyContent: "center", padding: SPACE.xl, gap: SPACE.md }} accessibilityRole="alert">
        <Illustration name="info" />
        <Txt role="title" center>
          {this.props.title}
        </Txt>
        <Txt color="onSurfaceMuted" center>
          {this.props.body}
        </Txt>
        <Button variant="filled" label={this.props.retry} onPress={() => this.setState({ failed: false })} />
      </View>
    );
  }
}
