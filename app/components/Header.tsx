"use client";

import { AgentStatus } from "./AgentStatus";

export function Header({ connected }: { connected: boolean | null }) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <div>
          <strong>MCAP Data Processing Platform</strong>
          <span>Data Intelligence Workspace</span>
        </div>
      </div>
      <AgentStatus connected={connected} />
    </header>
  );
}
