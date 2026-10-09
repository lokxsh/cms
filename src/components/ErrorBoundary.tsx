import { Component, type ReactNode } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { Button, EmptyState } from "./ui";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <EmptyState icon={WarningCircle} title="This page failed to load" body={this.state.error.message} action={<Button onClick={() => this.setState({ error: null })}>Try again</Button>} />;
    }
    return this.props.children;
  }
}
