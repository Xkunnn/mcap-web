const AGENT_CANDIDATES = [
  "http://127.0.0.1:8765",
  "http://localhost:8765",
] as const;

export let LOCAL_AGENT_URL: string = AGENT_CANDIDATES[0];

export type AgentDiagnostic = {
  connected: boolean;
  url: string;
  message: string;
  health?: Record<string, unknown>;
};

export function agentUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${LOCAL_AGENT_URL}${normalizedPath}`;
}

export async function inspectAgent(): Promise<AgentDiagnostic> {
  let lastMessage = "本地 Agent 未启动或端口 8765 无法访问";
  for (const base of AGENT_CANDIDATES) {
    try {
      const response = await fetch(`${base}/api/health`, { cache: "no-store" });
      if (!response.ok) {
        lastMessage = `健康接口返回异常（HTTP ${response.status}）`;
        continue;
      }
      const health = await response.json() as Record<string, unknown>;
      if (health.ok !== true) {
        lastMessage = "Agent 版本不兼容或转换器健康检查失败";
        continue;
      }
      LOCAL_AGENT_URL = base;
      return { connected: true, url: base, message: "本地 Agent 已连接", health };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/cors|network|failed to fetch/i.test(message)) {
        lastMessage = "无法访问本地 Agent：可能未启动、被浏览器本地网络策略或 CORS 阻止";
      }
    }
  }
  return { connected: false, url: LOCAL_AGENT_URL, message: lastMessage };
}

export async function requestAgent(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(agentUrl(path), { ...init, cache: init.cache ?? "no-store" });
}

export async function checkAgent(): Promise<boolean> {
  return (await inspectAgent()).connected;
}
