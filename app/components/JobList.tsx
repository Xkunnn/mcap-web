"use client";

import { useState } from "react";
import { agentUrl } from "../lib/agent";
import { jobFailureDetails } from "../lib/jobAdapter";
import type { Job } from "../types";
import { elapsedTime, formatBytes, formatDate, statusLabel } from "../utils";
import { AnalysisDashboard } from "./AnalysisDashboard";
import { DetailedMetrics } from "./DetailedMetrics";
import { VideoGallery } from "./VideoGallery";

type Tab = "analysis" | "video" | "metrics" | "dataset";

function DatasetGallery({ job }: { job: Job }) {
  if (!job.lerobot_results?.length && !job.lerobot_errors?.length) return <div className="empty-inline"><span>◇</span><strong>当前任务尚未生成 LeRobot 数据集</strong><p>点击“生成 LeRobot”创建训练数据集。</p></div>;
  return <div className="dataset-grid">
    {(job.lerobot_results || []).map((dataset) => <article className="dataset-card" key={dataset.download_url}>
      <div><span>LR</span><p><strong>{dataset.name}</strong><small>{dataset.robot_type || "LivUMI-Ego-Lite"}</small></p><em>{dataset.version || "v3.0"}</em></div>
      {dataset.preview_url && <video controls playsInline preload="metadata" src={agentUrl(dataset.preview_url)} />}
      <dl><div><dt>版本</dt><dd>{dataset.version || "v3.0"}</dd></div><div><dt>FPS</dt><dd>{dataset.fps ?? "—"}</dd></div><div><dt>Episodes</dt><dd>{dataset.episodes ?? 0}</dd></div><div><dt>Frames</dt><dd>{dataset.frames?.toLocaleString("zh-CN") ?? 0}</dd></div><div><dt>完整率</dt><dd>{dataset.completeness_pct?.toFixed(2) ?? "—"}%</dd></div><div><dt>视频大小</dt><dd>{dataset.video_size_mb?.toFixed(2) ?? "—"} MB</dd></div><div><dt>ZIP 大小</dt><dd>{formatBytes(dataset.archive_size)}</dd></div></dl>
      <div className="card-actions"><a href={agentUrl(dataset.download_url)}>下载 ZIP</a><a href={agentUrl(dataset.info_url)}>查看 info.json</a></div>
    </article>)}
    {(job.lerobot_errors || []).map((item) => <div className="error-banner" key={`${item.source}-${item.error}`}><strong>{item.source}</strong><span>{item.error}</span></div>)}
  </div>;
}

function JobCard({ job, onDelete, onAnalyze, onLeRobot, onRetry }: {
  job: Job; onDelete: (id: string) => void; onAnalyze: (id: string) => void; onLeRobot: (id: string) => void; onRetry: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("analysis");
  const totalSize = job.files.reduce((sum, file) => sum + file.size, 0);
  const busy = job.status === "queued" || job.status === "processing";
  const videoResults = job.results.filter((result) => !result.analysis_only && result.view_url && result.download_url);
  const analysisResults = [...new Map(
    job.results.filter((result) => result.analysis).map((result) => [result.source, result]),
  ).values()];
  const failures = jobFailureDetails(job);
  return <article className="job-card">
    <div className="job-summary">
      <div className="job-file-icon">MC</div>
      <div className="job-name"><strong>{job.files[0]?.name || `${job.file_count} MCAP files`}</strong><span>{job.file_count > 1 ? `+ ${job.file_count - 1} more files · ` : ""}{formatBytes(totalSize)}</span></div>
      <span className={`job-status status-${job.status}`}><i />{statusLabel(job.status)}</span>
      <div className="job-time"><span>CREATED</span><strong>{formatDate(job.created_at)}</strong></div>
      <div className="job-time"><span>耗时</span><strong>{elapsedTime(job.started_at || job.created_at, job.finished_at)}</strong></div>
      <div className="job-actions">
        <button disabled={busy || !job.files.length} onClick={() => onAnalyze(job.id)}>运行分析</button>
        <button disabled={busy || !job.files.length} onClick={() => onLeRobot(job.id)}>生成 LeRobot</button>
        <button disabled={busy || job.status !== "failed"} onClick={() => onRetry(job.id)}>重试</button>
        <button disabled={busy} className="danger" onClick={() => onDelete(job.id)}>删除</button>
      </div>
    </div>
    <div className="job-progress-line"><span style={{ width: `${job.progress}%` }} /></div>
    <div className="job-message"><span>{job.message}</span><span>成功 {job.succeeded_count} · 失败 {job.failed_count}</span><strong>{job.progress}%</strong></div>
    {busy ? <div className="processing-state"><span className="spinner" /><div><strong>Processing pipeline</strong><p>任务正在本地 Agent 中运行，结果会自动刷新。</p></div></div> : <>
      <nav className="result-tabs" aria-label="任务结果">
        <button className={tab === "analysis" ? "active" : ""} onClick={() => setTab("analysis")}>分析概览 <span>{analysisResults.length}</span></button>
        <button className={tab === "video" ? "active" : ""} onClick={() => setTab("video")}>视频预览 <span>{videoResults.length}</span></button>
        <button className={tab === "metrics" ? "active" : ""} onClick={() => setTab("metrics")}>详细指标 <span>{job.results.reduce((sum, r) => sum + (r.analysis?.metrics.length || 0), 0)}</span></button>
        <button className={tab === "dataset" ? "active" : ""} onClick={() => setTab("dataset")}>LeRobot <span>{job.lerobot_results?.length || 0}</span></button>
      </nav>
      <div className="tab-content">
        {tab === "analysis" && (analysisResults.length ? <AnalysisDashboard results={analysisResults} /> : <div className="failure-details"><strong>{job.status === "failed" ? "任务未生成可展示的分析结果" : "等待分析结果"}</strong>{failures.map((message, index) => <p key={`${message}-${index}`}>{message}</p>)}</div>)}
        {tab === "video" && <VideoGallery results={videoResults} />}
        {tab === "metrics" && <DetailedMetrics results={job.results} />}
        {tab === "dataset" && <DatasetGallery job={job} />}
      </div>
    </>}
  </article>;
}

export function JobList({ jobs, connected, onDelete, onAnalyze, onLeRobot, onRetry }: {
  jobs: Job[]; connected: boolean | null;
  onDelete: (id: string) => void; onAnalyze: (id: string) => void; onLeRobot: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  return <section className="jobs-section">
    <div className="section-heading"><div><span>任务队列</span><h2>处理任务与分析结果</h2><p>管理本地处理任务并查看数据质量。</p></div><div className="job-count"><strong>{jobs.length}</strong><span>任务总数</span></div></div>
    {connected === false && jobs.length === 0 ? <div className="empty-state offline"><span>!</span><strong>无法读取任务列表</strong><p>请启动本地 MCAP Agent，连接成功后任务会自动显示。</p></div>
      : jobs.length === 0 ? <div className="empty-state"><span>◇</span><strong>No jobs yet</strong><p>上传 MCAP 文件，开始第一条数据处理 Pipeline。</p></div>
      : <div className="job-list">{connected === false && <div className="stale-data-notice">Agent 暂时离线，以下为上次成功读取的数据。</div>}{jobs.map((job) => <JobCard key={job.id} job={job} onDelete={onDelete} onAnalyze={onAnalyze} onLeRobot={onLeRobot} onRetry={onRetry} />)}</div>}
  </section>;
}
