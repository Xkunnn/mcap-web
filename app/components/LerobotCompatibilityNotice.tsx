import { formatLerobotError } from "../lib/errorFormatter";

export function LerobotCompatibilityNotice({ error, source }: { error: string; source?: string }) {
  const formatted = formatLerobotError(error);
  return (
    <section className={`lerobot-notice lerobot-notice-${formatted.kind}`}>
      <div className="lerobot-notice-heading">
        <span>{formatted.kind === "unsupported" ? "!" : "×"}</span>
        <div>
          <strong>{formatted.title}</strong>
          {source && <small>{source}</small>}
        </div>
      </div>
      <p>{formatted.description}</p>
      <p>{formatted.supplemental}</p>
      <details>
        <summary>查看原始错误详情</summary>
        <code>{formatted.detail}</code>
      </details>
    </section>
  );
}
