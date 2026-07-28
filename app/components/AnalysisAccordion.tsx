import type { AnalysisMetric, TopicCandidate } from "../types";

const groups = [
  { name: "RGB / Camera", match: /camera|rgb/i },
  { name: "Gray", match: /gray|grey|灰度/i },
  { name: "Depth", match: /depth|深度/i },
  { name: "IMU", match: /imu|gyro|accel|惯性|陀螺|加速度/i },
  { name: "时间与帧诊断", match: /time|timestamp|interval|drop|frame|duration|时间|时长|间隔|丢帧|帧/i },
];

function MetricRows({ metrics }: { metrics: AnalysisMetric[] }) {
  return (
    <div className="detail-table-wrap">
      <table className="detail-table">
        <thead><tr><th>Metric</th><th>Target</th><th>Actual</th><th>Status</th></tr></thead>
        <tbody>
          {metrics.map((metric, index) => (
            <tr key={`${metric.metric}-${metric.topic}-${index}`}>
              <td><strong>{metric.metric}</strong>{metric.topic && <small>{metric.topic}</small>}</td>
              <td>{metric.target || "—"}</td>
              <td>{metric.actual || "—"}</td>
              <td><span className={`table-status result-${metric.result.toLowerCase().replace("/", "")}`}>{metric.result}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalysisAccordion({ metrics, topics }: { metrics: AnalysisMetric[]; topics: TopicCandidate[] }) {
  const claimed = new Set<AnalysisMetric>();
  const sections = groups.map((group) => {
    const items = metrics.filter((metric) => group.match.test(`${metric.metric} ${metric.topic || ""}`));
    items.forEach((item) => claimed.add(item));
    return { ...group, items };
  });
  const other = metrics.filter((metric) => !claimed.has(metric));
  return (
    <div className="accordion-stack">
      {sections.map((section) => (
        <details className="accordion" key={section.name}>
          <summary><span className={`stream-dot stream-${section.name.toLowerCase()}`} /><strong>{section.name}</strong><span>{section.items.length} metrics</span><i>⌄</i></summary>
          {section.items.length ? <MetricRows metrics={section.items} /> : <p className="accordion-empty">未识别到此类数据指标</p>}
        </details>
      ))}
      {other.length > 0 && (
        <details className="accordion">
          <summary><span className="stream-dot" /><strong>System & Other</strong><span>{other.length} metrics</span><i>⌄</i></summary>
          <MetricRows metrics={other} />
        </details>
      )}
      {topics.length > 0 && (
        <details className="accordion">
          <summary><span className="stream-dot stream-topic" /><strong>Detected Topics</strong><span>{topics.length} topics</span><i>⌄</i></summary>
          <div className="topic-grid">
            {topics.map((topic) => (
              <div key={`${topic.topic}-${topic.kind}`}>
                <strong>{topic.kind || "DATA"}</strong><span>{topic.topic}</span>
                <small>{topic.media_format || "—"} · {topic.hz?.toFixed(2) ?? "—"} Hz · {topic.message_count?.toLocaleString("zh-CN") ?? "—"} msgs</small>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
