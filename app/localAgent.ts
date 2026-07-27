// Backward-compatible aliases. New code should import from app/lib/agent.
export {
  LOCAL_AGENT_URL as LOCAL_AGENT,
  agentUrl as localAgentUrl,
  checkAgent as checkLocalAgent,
  requestAgent as localAgentFetch,
} from "./lib/agent";
