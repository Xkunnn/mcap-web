"use client";

import { AgentStatus } from "./AgentStatus";

export function Header({ connected, message }: { connected: boolean | null; message?: string }) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <div>
          <strong>MCAP 数据处理工作台</strong>
          <span>MCAP Data Processing Workspace</span>
        </div>
      </div>
      <AgentStatus connected={connected} message={message} />
    </header>
  );
}
