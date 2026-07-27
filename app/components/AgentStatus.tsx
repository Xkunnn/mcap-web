export function AgentStatus({ connected }: { connected: boolean | null }) {
  const state = connected === null ? "checking" : connected ? "online" : "offline";
  const label = connected === null
    ? "Connecting to Local Agent"
    : connected
      ? "Local Agent Connected"
      : "Agent Offline";
  return (
    <div className={`agent-status ${state}`} title={connected === false ? "请启动本地 MCAP Agent" : undefined}>
      <span className="status-dot" />
      <span>{label}</span>
    </div>
  );
}
