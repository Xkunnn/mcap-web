export function AgentStatus({ connected, message }: { connected: boolean | null; message?: string }) {
  const state = connected === null ? "checking" : connected ? "online" : "offline";
  const label = connected === null
    ? "正在连接本地 Agent"
    : connected
      ? "本地 Agent 已连接"
      : "本地 Agent 未启动";
  return (
    <div className={`agent-status ${state}`} title={message || undefined}>
      <span className="status-dot" />
      <span>{label}</span>
    </div>
  );
}
