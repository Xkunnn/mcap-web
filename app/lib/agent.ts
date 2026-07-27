export const LOCAL_AGENT_URL = "http://127.0.0.1:8765";

export function agentUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${LOCAL_AGENT_URL}${normalizedPath}`;
}

export async function requestAgent(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(agentUrl(path), {
    ...init,
    cache: init.cache ?? "no-store",
  });
}

export async function checkAgent(): Promise<boolean> {
  try {
    const response = await requestAgent("/api/health");
    if (!response.ok) return false;
    const health = (await response.json()) as { ok?: boolean };
    return health.ok === true;
  } catch {
    return false;
  }
}
