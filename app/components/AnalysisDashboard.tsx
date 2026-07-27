import { agentUrl } from "../lib/agent";
import type { McapAnalysis, ResultItem } from "../types";
import { formatBytes } from "../utils";
import { AnalysisAccordion } from "./AnalysisAccordion";
import { MetricCard } from "./MetricCard";

function sensorData(analysis: McapAnalysis, kind: "RGB" | "IMU" | "Depth") {
  const metricName = kind === "RGB" ? "Camera FPS" : kind === "IMU" ? "IMU Hz" : "Depth FPS";
  const rate = analysis.metrics.find((item) => item.metric === metricName);
  const resolution = analysis.metrics.find((item) => item.metric === (kind === "RGB" ? "Camera 分辨率" : "Depth 分辨率"));
  const topic = analysis.selected_topics.find((item) => item.kind === kind);
  const stored = analysis.sensors?.[kind];
  return stored || {
    kind,
    status: rate?.result || "N/A",
    rate: rate?.actual,
    rate_unit: kind === "IMU" ? "Hz" : "FPS",
    resolution: resolution?.actual,
    topic: topic?.topic,
  };
}

export function AnalysisDashboard({ result }: { result: ResultItem }) {
  const analysis = result.analysis;
  if (!analysis) {
    return <div className="empty-inline"><span>◇</span><strong>Analysis not available</strong><p>点击任务操作中的“运行检测”生成 MCAP 质量报告。</p></div>;
  }
  if (analysis.error) return <div className="error-banner">{analysis.error}</div>;
  const frame = analysis.frame_diagnostics || {};
  const sensors = (["RGB", "IMU", "Depth"] as const).map((kind) => sensorData(analysis, kind));
  return (
    <section className="analysis-dashboard">
      <div className="dashboard-title">
        <div><span>ANALYSIS DASHBOARD</span><h3>{result.source}</h3><p>MCAP acquisition quality and stream diagnostics</p></div>
        <span className={`quality-score result-${analysis.status.toLowerCase()}`}>{analysis.status}</span>
      </div>
      <div className="task-info-grid">
        <div><span>FILE NAME</span><strong>{result.source}</strong></div>
        <div><span>FILE SIZE</span><strong>{analysis.file_size_mb ? `${analysis.file_size_mb.toFixed(2)} MB` : formatBytes(result.size)}</strong></div>
        <div><span>RECORDING TIME</span><strong>{analysis.duration_s?.toFixed(2) ?? "—"} s</strong></div>
        <div><span>MESSAGES</span><strong>{analysis.total_messages?.toLocaleString("zh-CN") ?? "—"}</strong></div>
        <div><span>TOPICS</span><strong>{analysis.topic_count ?? "—"}</strong></div>
      </div>
      <div className="metric-grid">
        {sensors.map((sensor) => (
          <MetricCard
            key={sensor.kind}
            name={sensor.kind}
            value={sensor.rate && sensor.rate !== "-" ? sensor.rate : "—"}
            unit={sensor.rate_unit || (sensor.kind === "IMU" ? "Hz" : "FPS")}
            status={sensor.status}
            detail={sensor.kind === "IMU" ? sensor.topic : sensor.resolution || sensor.topic}
          />
        ))}
      </div>
      <div className="stat-strip">
        <div><span>Capture efficiency</span><strong>{analysis.capture_efficiency_pct?.toFixed(2) ?? "—"}%</strong></div>
        <div><span>Average FPS</span><strong>{frame.average_fps?.toFixed(2) ?? "—"}</strong></div>
        <div><span>P95 interval</span><strong>{frame.interval_p95_ms?.toFixed(2) ?? "—"} ms</strong></div>
        <div><span>Max interval</span><strong>{frame.interval_max_ms?.toFixed(2) ?? "—"} ms</strong></div>
        <div><span>Missing frames</span><strong>{frame.estimated_missing_frames ?? "—"}</strong></div>
      </div>
      <div className="subsection-heading"><div><span>DETAILS</span><h4>Stream diagnostics</h4></div><span>展开查看详细指标</span></div>
      <AnalysisAccordion metrics={analysis.metrics} topics={analysis.selected_topics} />
      {analysis.report_url && <a className="download-link" href={agentUrl(analysis.report_url)}>Download analysis JSON ↓</a>}
    </section>
  );
}
