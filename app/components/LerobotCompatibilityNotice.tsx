import { formatLerobotError } from "../lib/errorFormatter";

export function LerobotCompatibilityNotice({ error, source, onRetry, retryDisabled = false }: {
  error: string;
  source?: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
}) {
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
        <summary>展开原始错误详情</summary>
        <pre>{formatted.detail}</pre>
      </details>
      {onRetry && <button type="button" disabled={retryDisabled} onClick={onRetry}>
        {retryDisabled ? "正在重新生成…" : "重新生成 LeRobot"}
      </button>}
    </section>
  );
}
