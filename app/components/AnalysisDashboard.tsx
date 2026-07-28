import type { McapAnalysis, ResultItem } from "../types";
import { MetricCard } from "./MetricCard";

function metricValue(analysis: McapAnalysis, name: string) {
  const metric = analysis.metrics.find((item) => item.metric.toLowerCase() === name.toLowerCase());
  return { value: metric?.actual || "—", status: metric?.result || "N/A", detail: metric?.note || metric?.topic };
}

export function AnalysisDashboard({ result }: { result: ResultItem }) {
  const analysis = result.analysis;
  if (!analysis) {
    return <div className="empty-inline"><span>◇</span><strong>Analysis not available</strong><p>点击任务操作中的“运行检测”生成 MCAP 质量报告。</p></div>;
  }
  if (analysis.error) return <div className="error-banner">{analysis.error}</div>;
  const frame = analysis.frame_diagnostics || {};
  return (
    <section className="analysis-dashboard">
      <div className="dashboard-title">
        <div><span>ANALYSIS DASHBOARD</span><h3>{result.source}</h3><p>MCAP acquisition quality and stream diagnostics</p></div>
        <span className={`quality-score result-${analysis.status.toLowerCase()}`}>{analysis.status}</span>
      </div>
      <div className="overview-metrics">
        <MetricCard name="综合状态" value={analysis.status} unit="" status={analysis.status} detail={`${analysis.counts.PASS || 0} PASS · ${analysis.counts.FAIL || 0} FAIL`} />
        <MetricCard name="RGB FPS" {...metricValue(analysis, "Camera FPS")} unit="FPS" />
        <MetricCard name="Gray FPS" {...metricValue(analysis, "Gray FPS")} unit="FPS" />
        <MetricCard name="Depth FPS" {...metricValue(analysis, "Depth FPS")} unit="FPS" />
        <MetricCard name="IMU Hz" {...metricValue(analysis, "IMU Hz")} unit="Hz" />
        <MetricCard name="采集效率" value={analysis.capture_efficiency_pct?.toFixed(2) || "—"} unit="%" status={analysis.capture_efficiency_pct == null ? "N/A" : analysis.capture_efficiency_pct >= 90 ? "PASS" : "CHECK"} detail={`丢帧 ${frame.estimated_missing_frames ?? "—"}`} />
        <MetricCard name="文件时长" value={analysis.duration_s?.toFixed(2) || "—"} unit="s" status="N/A" detail={result.source} />
        <MetricCard name="消息总数" value={analysis.total_messages?.toLocaleString("zh-CN") || "—"} unit="" status="N/A" detail={`${analysis.topic_count ?? "—"} Topics`} />
      </div>
    </section>
  );
}
