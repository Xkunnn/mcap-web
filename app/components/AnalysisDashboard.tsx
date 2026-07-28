import type { McapAnalysis, ResultItem } from "../types";
import { MetricCard } from "./MetricCard";

function metricValue(analysis: McapAnalysis, name: string) {
  const metric = analysis.metrics.find((item) => item.metric.toLowerCase() === name.toLowerCase());
  return { value: metric?.actual || "—", status: metric?.result || "N/A" };
}

function FullAnalysis({ result }: { result: ResultItem }) {
  const analysis = result.analysis!;
  const frame = analysis.frame_diagnostics || {};
  return (
    <section className="analysis-dashboard">
      <div className="dashboard-title">
        <div><span>分析概览</span><h3>{result.source}</h3><p>MCAP 采集质量与数据流诊断</p></div>
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

function CompactAnalysis({ result, dense }: { result: ResultItem; dense: boolean }) {
  const analysis = result.analysis!;
  const rgb = metricValue(analysis, "Camera FPS");
  const gray = metricValue(analysis, "Gray FPS");
  const depth = metricValue(analysis, "Depth FPS");
  const imu = metricValue(analysis, "IMU Hz");
  const metrics = [
    ["RGB", rgb.value, "FPS", rgb.status],
    ...(!dense ? [["Gray", gray.value, "FPS", gray.status]] : []),
    ["Depth", depth.value, "FPS", depth.status],
    ["IMU", imu.value, "Hz", imu.status],
    ["效率", analysis.capture_efficiency_pct?.toFixed(1) || "—", "%", analysis.capture_efficiency_pct == null ? "N/A" : analysis.capture_efficiency_pct >= 90 ? "PASS" : "CHECK"],
    ...(!dense ? [["时长", analysis.duration_s?.toFixed(1) || "—", "s", "N/A"]] : []),
  ] as string[][];
  return (
    <article className={`file-analysis-card ${dense ? "dense" : ""}`}>
      <header>
        <div><strong title={result.source}>{result.source}</strong><span>{analysis.total_messages?.toLocaleString("zh-CN") || "—"} 条消息 · {analysis.topic_count ?? "—"} Topics</span></div>
        <em className={`result-${analysis.status.toLowerCase()}`}>{analysis.status}</em>
      </header>
      {analysis.error ? <p className="file-analysis-error">{analysis.error}</p> : (
        <div className="compact-metrics">
          {metrics.map(([name, value, unit, status]) => (
            <div key={name}><span>{name}</span><strong>{value}<small>{unit}</small></strong><i className={`result-${status.toLowerCase().replace("/", "")}`}>{status}</i></div>
          ))}
        </div>
      )}
    </article>
  );
}

export function AnalysisDashboard({ results }: { results: ResultItem[] }) {
  const analyzed = results.filter((result) => result.analysis);
  if (!analyzed.length) {
    return <div className="empty-inline"><span>◇</span><strong>暂无分析结果</strong><p>点击任务操作中的“运行分析”生成 MCAP 质量报告。</p></div>;
  }
  if (analyzed.length === 1) return <FullAnalysis result={analyzed[0]} />;
  const dense = analyzed.length >= 5;
  return (
    <section className="multi-analysis">
      <div className="multi-analysis-heading">
        <div><strong>多文件分析概览</strong><span>共 {analyzed.length} 个文件，点击“详细指标”查看每个文件的完整检测数据。</span></div>
        <span>{analyzed.filter((result) => result.analysis?.status === "PASS").length} PASS · {analyzed.filter((result) => result.analysis?.status === "FAIL").length} FAIL</span>
      </div>
      <div className={`file-analysis-grid ${dense ? "dense" : ""}`}>
        {analyzed.map((result) => <CompactAnalysis key={result.source} result={result} dense={dense} />)}
      </div>
    </section>
  );
}
